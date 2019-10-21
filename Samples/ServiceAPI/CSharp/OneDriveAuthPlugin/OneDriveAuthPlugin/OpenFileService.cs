﻿using DocumentFormat.OpenXml.Packaging;
using HP.HPTRIM.SDK;
using HP.HPTRIM.Service;
using Microsoft.Graph;
using Office_OOXML_EmbedAddin;
using ServiceStack;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace OneDriveAuthPlugin
{
	[Route("/OpenFile/{Uri}", "GET")]
	public class OpenFile : ITrimRequest
	{
		public long Uri { get; set; }
	}

	public class OpenFileResponse : IHasResponseStatus
	{
		public string WebUrl { get; set; }
		public string WebDavUrl { get; set; }

		public bool UserHasAccess { get; set; }

		public ServiceStack.ResponseStatus ResponseStatus { get; set; }
	}

	//public class MyClientFactory : Microsoft.IdentityModel.Clients.ActiveDirectory.IHttpClientFactory
	//{
	//	private HttpClient httpClient;

	//	public MyClientFactory(HttpClientHandler httpClientHandler)
	//	{
	//		httpClient = new HttpClient(httpClientHandler);
	//	}
	//	public HttpClient GetHttpClient()
	//	{
	//		return httpClient;
	//	}
	//}

	public class OpenFileService : BaseOneDriveService
	{
		private static Microsoft.Graph.GraphServiceClient getClient(string accessToken)
		{
			var httpClientHandler = new HttpClientHandler
			{
				Proxy = new WebProxy("http://localhost:8888"),
				UseDefaultCredentials = true
			};

			var httpProvider = new HttpProvider(httpClientHandler, false);

			return new Microsoft.Graph.GraphServiceClient(new Microsoft.Graph.DelegateAuthenticationProvider((requestMessage) =>
			{
				requestMessage
					.Headers
					.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("bearer", accessToken);

				return Task.FromResult(0);
			}));
		}

		private async Task<Microsoft.Graph.DriveItem> doUpload(string filePath, string fileName, string accessToken)
		{
			string token = await getToken();

			var graphServiceClient = getClient(token);

			using (var file = System.IO.File.OpenRead(filePath))
			{
				MemoryStream stream = new MemoryStream();
				file.CopyTo(stream);


				autoOpen(stream);

				var documentFolder = await ODataHelper.PostFolder<OneDriveItem>(GraphApiHelper.GetOneDriveChildrenUrl(), token);


				var uploadSession = await graphServiceClient.Drives[documentFolder.ParentReference.DriveId].Items[documentFolder.Id].ItemWithPath(fileName).CreateUploadSession().Request().PostAsync();

				string ul = uploadSession.UploadUrl += "&$select=Id,ParentReference,WebUrl,WebDavUrl";

				var maxChunkSize = (320 * 1024) * 10; // 5000 KB - Change this to your chunk size. 5MB is the default.
				var provider = new ChunkedUploadProvider(uploadSession, graphServiceClient, stream, maxChunkSize);


				// Setup the chunk request necessities
				var chunkRequests = provider.GetUploadChunkRequests();
				var readBuffer = new byte[maxChunkSize];
				var trackedExceptions = new List<Exception>();
				DriveItem itemResult = null;

				//upload the chunks
				foreach (var request in chunkRequests)
				{
					// Do your updates here: update progress bar, etc.
					// ...
					// Send chunk request
					var result = await provider.GetChunkRequestResponseAsync(request, readBuffer, trackedExceptions);

					if (result.UploadSucceeded)
					{
						itemResult = result.ItemResponse;
					}
				}

				// Check that upload succeeded
				if (itemResult != null)
				{
					return itemResult;
				}
			}
			throw new ApplicationException("Upload failed.");
		}

		public async Task<object> Get(OpenFile request)
		{
			if (request.Uri < 1)
			{
				throw new HttpError(HttpStatusCode.BadRequest, "400", "Invalid Uri");
			}

			var response = new OpenFileResponse() { UserHasAccess = true };
			var record = new Record(this.Database, request.Uri);

			string driveId = record.GetDriveId();

			if (!string.IsNullOrWhiteSpace(driveId))
			{
				OneDriveItem fileResult = null;
				string token = await getToken();

				try
				{
					fileResult = await ODataHelper.GetItem<OneDriveItem>(GraphApiHelper.GetOneDriveItemIdUrl(driveId), token, null);
				}
				catch (Exception ex)
				{
					response.UserHasAccess = false;
				}

				if (response.UserHasAccess == false)
				{
					token = getApplicationToken();
					fileResult = await ODataHelper.GetItem<OneDriveItem>(GraphApiHelper.GetOneDriveItemIdUrl(driveId), token, null);
				}
				response.WebUrl = fileResult.WebUrl;
				response.WebDavUrl = fileResult.WebDavUrl;
			}
			else if (record.IsElectronic)
			{

				try
				{
					string token = await getToken();
					string folderId = string.Empty;

					var documentFolder = await ODataHelper.PostFolder<OneDriveItem>(GraphApiHelper.GetOneDriveChildrenUrl(), token);
					folderId = documentFolder.Id;

					if (!record.IsDocumentInClientCache)
					{
						record.LoadDocumentIntoClientCache();
					}

					Regex pattern = new Regex("[\\\\/<>|?]|[\n]{2}");

					string fileName = $"{Path.GetFileNameWithoutExtension(record.SuggestedFileName)} ({pattern.Replace(record.Number, "_")}){Path.GetExtension(record.SuggestedFileName)}";



					var uploadedFile = await doUpload(record.DocumentPathInClientCache, fileName, token);

					bool checkout = true;
					if (record.IsCheckedOut && record.CheckedOutTo.Uri == this.Database.CurrentUser.Uri)
					{
						checkout = false;
					}


					record.GetDocument(null, checkout, null, uploadedFile.ParentReference.DriveId + "/items/" + uploadedFile.Id);
					record.SetDriveId(uploadedFile.ParentReference.DriveId + "/items/" + uploadedFile.Id);// uploadedFile. fileItem.getDriveAndId();

					record.Save();


					response.WebUrl = uploadedFile.WebUrl;
					response.WebDavUrl = uploadedFile.WebDavUrl;

				}
				catch
				{
					try
					{
						record.UndoCheckout(null);
					}
					catch { }
					//	return new Error
					throw;
				}
			}
			else
			{
				throw new Exception("Record is not a valid document.");
			}
			return response;
		}

		private void autoOpen(Stream stream)
		{
			string addinGuid = ConfigurationManager.AppSettings["owa:Id"];
			string addinVersion = ConfigurationManager.AppSettings["owa:Version"];

			using (var document = WordprocessingDocument.Open(stream, true))
				{
				var webExTaskpanesPart = document.WebExTaskpanesPart ?? document.AddWebExTaskpanesPart();
					OOXMLHelper.CreateWebExTaskpanesPart(webExTaskpanesPart, addinGuid, addinVersion);
				}				

		}

		// I am not 100% sure but the OnEndRequest method of Disposing seems to get called before the async services, that is why I am disposing here.
		// If I continue to get Disposal errors I will need to re-think this.
		public override void Dispose()
		{
			this.Database.Dispose();
			base.Dispose();
		}
	}
}
