(global as any).config = { BASE_URL: "", SERVICEAPI_PATH: "ServiceAPI" };
import BaseObjectTypes from "../trim-coms/trim-baseobjecttypes";
import {
	IRecordType,
	SERVICEAPI_BASE_URI,
	TrimConnector,
	IClassification,
	ITrimMainObject,
} from "./trim-connector";
import MockAdapter from "axios-mock-adapter";
import TrimMessages from "./trim-messages";
import CommandIds from "./trim-command-ids";
import { AssertionError } from "assert";

//import * as fetchMock from "fetch-mock";

const axios = require("axios");
//const MockAdapter = require("axios-mock-adapter");

const mock = new MockAdapter(axios);

describe("Test makeFriendlySearchQuery", () => {
	const trimConnector = new TrimConnector();
	trimConnector.credentialsResolver = (callback) => {
		callback("token123", "");
	};

	it("shortcut for Records", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.Record,
			"test"
		);

		expect(query).toEqual("recAnyWord:test* OR recNumber:test*");
	});

	it("shortcut for Locations", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.Location,
			"test"
		);

		expect(query).toEqual(
			"locGivenNames:test* OR locSortName:test* OR locLogin:test*"
		);
	});

	it("shortcut for Other", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.RecordType,
			"test"
		);

		expect(query).toEqual("test*");
	});

	it("shortcut for Classification", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.Classification,
			"test"
		);

		expect(query).toEqual("plnWord:test* OR plnTitle:test*");
	});
});

describe("Test fetch from TRIM", () => {
	const trimConnector = new TrimConnector();
	trimConnector.credentialsResolver = (callback) => {
		callback("token123", "");
	};

	it("Record Types are returned", () => {
		let props: string = "";
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/RecordType`, {
				params: {
					q: "all",
					properties: "NameString,PossiblyHasSubordinates,Icon",
					purpose: 3,
					pageSize: 30,
					start: 1,
					ExcludeCount: true,
					ApplyDefaults: true,
					HideCustomRecordTypes: true,
				},
			})
			.reply(function(config: any) {
				props = config.params.properties;

				return [
					200,
					{
						Results: [{ NameString: "Document", Uri: 1 }],
					},
				];
			});

		expect.assertions(2);
		return trimConnector
			.search<IRecordType>({
				trimType: BaseObjectTypes.RecordType,
				q: "all",
				purpose: 3,
			})
			.then((data) => {
				expect(props).toEqual("NameString,PossiblyHasSubordinates,Icon");
				expect(data.results[0].NameString).toBe("Document");
			});
	});

	it("passes sort to search", () => {
		let sortBy: string = "";
		mock.onGet(`${SERVICEAPI_BASE_URI}/Record`).reply(function(config: any) {
			sortBy = config.params.sortBy;

			return [
				200,
				{
					Results: [{ NameString: "Rec_1", Uri: 1 }],
				},
			];
		});

		expect.assertions(1);
		return trimConnector
			.search<ITrimMainObject>({
				trimType: BaseObjectTypes.Record,
				q: "all",
				purpose: 3,
				sortBy: "registeredOn",
			})
			.then(() => {
				expect(sortBy).toEqual("registeredOn");
			});
	});

	it("passes filter to search", () => {
		let filter: string = "";
		mock.onGet(`${SERVICEAPI_BASE_URI}/Record`).reply(function(config: any) {
			filter = config.params.filter;

			return [
				200,
				{
					Results: [{ NameString: "Rec_1", Uri: 1 }],
				},
			];
		});

		expect.assertions(1);
		return trimConnector
			.search<ITrimMainObject>({
				trimType: BaseObjectTypes.Record,
				q: "all",
				purpose: 3,
				filter: "electronic",
			})
			.then(() => {
				expect(filter).toEqual("electronic");
			});
	});

	it("passes properties", () => {
		let properties: string = "";
		let selectedIds: string = "";
		mock.onGet(`${SERVICEAPI_BASE_URI}/Record`).reply(function(config: any) {
			properties = config.params.properties;
			selectedIds = config.params.cid_SelectedIds;

			return [
				200,
				{
					Results: [{ NameString: "Rec_1", Uri: 1 }],
				},
			];
		});

		expect.assertions(2);
		return trimConnector
			.search<ITrimMainObject>({
				trimType: BaseObjectTypes.Record,
				q: "all",
				purpose: 3,
				properties: "EnabledCommandIds",
				commandFilter: "MakeStopWord,RecAddToCase",
			})
			.then(() => {
				expect(properties.indexOf(",EnabledCommandIds")).toBeGreaterThan(-1);
				expect(selectedIds).toEqual("MakeStopWord,RecAddToCase");
			});
	});

	it("returns success when no results found.", () => {
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/RecordType`, {
				params: {
					q: "all",
					properties: "NameString,PossiblyHasSubordinates,Icon",
					purpose: 3,
					pageSize: 30,
					start: 1,
					purposeExtra: 123,
					ExcludeCount: true,
					ApplyDefaults: true,
					HideCustomRecordTypes: true,
				},
			})
			.reply(function(config: any) {
				return [
					200,
					{
						Results: [],
					},
				];
			});
		expect.assertions(1);

		return trimConnector
			.search<IRecordType>({
				trimType: BaseObjectTypes.RecordType,
				q: "all",
				purpose: 3,
				purposeExtra: 123,
			})
			.then((data) => {
				expect(data.results.length).toBe(0);
			});
	});

	it("the prefix is removed from the property name", () => {
		mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/Classification`).replyOnce(200, {
			Results: [
				{
					ClassificationName: { Value: "Test Name" },
					PossiblyHasSubordinates: true,
					TrimType: "Classification",
					NameString: "Accounting - Accounting Automatic",
					Uri: 9000000005,
				},
			],
			PropertiesAndFields: {},
			TotalResults: 1,
			CountStringEx: "1 Classification",
			MinimumCount: 1,
			Count: 0,
			HasMoreItems: false,
			SearchTitle:
				"Classifications - parent:9000000004 (Accounting) - 1 Classification",
			HitHighlightString: "",
			TrimType: "Classification",
			ResponseStatus: {},
		});

		expect.assertions(1);
		return trimConnector
			.search<IClassification>({
				trimType: BaseObjectTypes.Classification,
				q: "all",
				purpose: 3,
				purposeExtra: 123,
			})
			.then((data) => {
				expect(data.results[0].Name.Value).toBe("Test Name");
			});
	});

	it("the FullFormattedName is david", () => {
		mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/Location/me`).replyOnce(200, {
			Results: [{ LocationFullFormattedName: { Value: "david" } }],
		});

		expect.assertions(1);
		return trimConnector.getMe().then((data) => {
			expect(data.FullFormattedName.Value).toBe("david");
		});
	});

	it("does not send a body with a GET", async () => {
		mock.reset();
		let body = {};
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/Location/me`)
			.replyOnce(function(config: any) {
				body = config.data;

				return [
					200,
					{
						Results: [{ LocationFullFormattedName: { Value: "david" } }],
					},
				];
			});

		await trimConnector.getMe();
		expect(body).toBeUndefined();
	});

	it("Application name is Content Manager", async () => {
		let messageMatch: string = "";

		mock
			.onGet(`${SERVICEAPI_BASE_URI}/Localisation`)
			.reply(function(config: any) {
				messageMatch = config.params.MatchMessages;
				return [
					200,
					{
						Messages: { web_HPRM: "Content Manager" },
						ResponseStatus: {},
					},
				];
			});

		expect.assertions(2);
		const data = await trimConnector.getMessages();
		expect(data.web_HPRM).toBe("Content Manager");
		expect(messageMatch).toEqual(Object.keys(new TrimMessages()).join("|"));
	});

	it("Property sheet requested from Record Type", () => {
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/RecordType/123`, {
				params: { properties: "dataentryformdefinition" },
			})
			.reply(200, {
				Results: [
					{
						TrimType: "RecordType",
						DataEntryFormDefinition: {
							Version: "1",
							SupportsElectronicDocs: true,
							TitlingMethod: "FreeText",
							Pages: [{}],
						},
					},
				],
			});

		expect.assertions(1);
		return trimConnector.getPropertySheet(123).then((data) => {
			expect(data.Pages.length).toBe(1);
		});
	});

	it("Error is handled", () => {
		//mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/RecordType/567`).reply(500, {
			Count: 0,
			HasMoreItems: false,
			MinimumCount: 0,
			PropertiesAndFields: {},
			ResponseStatus: {
				ErrorCode: "ApplicationException",
				Errors: [],
				Message: "Unable to find object test",
			},
			Results: [],
			TotalResults: 0,
			TrimType: "Location",
		});

		expect.assertions(1);

		return trimConnector
			.getPropertySheet(567)
			.then(() => {})
			.catch((data) => {
				expect(data.message).toBe("Unable to find object test");
			});
	});

	it("Error is handled on Get me", () => {
		//mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/Location/me`).reply(500, {
			Count: 0,
			HasMoreItems: false,
			MinimumCount: 0,
			PropertiesAndFields: {},
			ResponseStatus: {
				ErrorCode: "ApplicationException",
				Errors: [],
				Message: "Unable to find object test",
			},
			Results: [],
			TotalResults: 0,
			TrimType: "Location",
		});

		expect.assertions(1);

		return trimConnector
			.getMe()
			.then(() => {})
			.catch((data) => {
				// expect(appStore.status).toBe("ERROR");
				expect(data.message).toBe("Unable to find object test");
			});
	});

	it("has posted a new Record", () => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function(config: any) {
			postConfig = config;

			return [
				200,
				{
					Results: [
						{
							Uri: 123,
						},
					],
				},
			];
		});

		expect.assertions(4);

		return trimConnector
			.registerInTrim(1, { RecordTypedTitle: "test" })
			.then((data) => {
				expect(postConfig.data).toEqual(
					JSON.stringify({
						RecordTypedTitle: "test",
						RecordRecordType: 1,
						properties: "CommandDefs",
					})
				);
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
				expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
				expect(data.Uri).toEqual(123);
			});
	});

	it("has posted a new Record with field values", () => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function(config: any) {
			postConfig = config;

			return [
				200,
				{
					Results: [
						{
							Uri: 123,
						},
					],
				},
			];
		});

		expect.assertions(4);

		return trimConnector
			.registerInTrim(1, { RecordTypedTitle: "test" }, { DriveId: "test" })
			.then((data) => {
				expect(postConfig.data).toEqual(
					JSON.stringify({
						RecordTypedTitle: "test",
						RecordRecordType: 1,
						properties: "CommandDefs",
						Fields: { DriveId: "test" },
					})
				);
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
				expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
				expect(data.Uri).toEqual(123);
			});
	});

	it("get view pane property defs", () => {
		let postConfig: any;

		// mock
		// 	.onGet(`${SERVICEAPI_BASE_URI}/Location/me`)
		// 	.replyOnce(function(config: any) {
		// 		body = config.data;

		// 		return [
		// 			200,
		// 			{
		// 				Results: [{ LocationFullFormattedName: { Value: "david" } }],
		// 			},
		// 		];
		// 	});

		mock
			.onGet(`${SERVICEAPI_BASE_URI}/PropertyDef`)
			.replyOnce(function(config: any) {
				postConfig = config;

				return [
					200,
					{
						PropertiesAndFields: [
							{
								Id: "RecordTitle",
								IsEMailAddress: false,
								IsHyperlink: false,
								DefaultColumnCharacters: 20,
								ColumnWidth: 134,
								IsDefaultDataGridColumn: true,
								BestFitColumn: false,
								IconAndOrTextMode: "IconAndText",
								StringAlignment: "Left",
								SortMode: "AlphaNoCase",
								Caption: "Title",
								ObjectType: "Unknown",
								PFFormat: "String",
								Property: {},
								PropertyId: "RecordTitle",
								IsAField: false,
								IsAProperty: true,
								IsMandatory: false,
							},
						],
						ResponseStatus: {},
					},
				];
			});

		expect.assertions(2);

		return trimConnector
			.getViewPanePropertyDefs(BaseObjectTypes.Record, 5)
			.then((data) => {
				expect(postConfig.params).toEqual({
					TrimType: "Record",
					ForObject: 5,
					Get: "ViewPane",
				});
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
			});
	});
	it("has updated view pane properties", () => {
		let postConfig: any;
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/PropertyDef`)
			.reply(function(config: any) {
				postConfig = config;

				return [
					200,
					{
						PropertiesAndFields: [
							{
								Id: "RecordTitle",
								IsEMailAddress: false,
								IsHyperlink: false,
								DefaultColumnCharacters: 20,
								ColumnWidth: 134,
								IsDefaultDataGridColumn: true,
								BestFitColumn: false,
								IconAndOrTextMode: "IconAndText",
								StringAlignment: "Left",
								SortMode: "AlphaNoCase",
								Caption: "Title",
								ObjectType: "Unknown",
								PFFormat: "String",
								Property: {},
								PropertyId: "RecordTitle",
								IsAField: false,
								IsAProperty: true,
								IsMandatory: false,
							},
						],
						ResponseStatus: {},
					},
				];
			});

		expect.assertions(3);

		return trimConnector
			.setViewPaneProperties({ Uri: 1, TrimType: BaseObjectTypes.Record }, [
				"RecordTitle",
			])
			.then((data) => {
				expect(postConfig.data).toEqual(
					JSON.stringify({
						TrimType: "Record",
						ForObject: 1,
						PropertiesAndFields: [{ Id: "RecordTitle" }],
						ListType: "Detailed",
					})
				);
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
				expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
			});
	});

	it("get global user options", () => {
		let postConfig: any;
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/UserOptions/ViewPane`)
			.reply(function(config: any) {
				postConfig = config;

				return [
					200,
					{
						UserOptions: {
							__type:
								"HP.HPTRIM.ServiceModel.ViewPaneUserOptions, HP.HPTRIM.ServiceAPI.Model",
							LoadFromGlobalSetting: false,
							SaveAsGlobalSetting: false,
						},
						ResponseStatus: {},
					},
				];
			});

		expect.assertions(3);

		return trimConnector.getGlobalUserOptions("ViewPane").then((data) => {
			expect(postConfig.data).toEqual(
				JSON.stringify({
					LoadFromGlobalSetting: true,
				})
			);
			expect(postConfig.headers!["Accept"]).toEqual("application/json");
			expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
		});
	});

	it("cancelled the request", (done) => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function(config: any) {
			postConfig = config;
			setTimeout(() => {}, 10);
			return [
				200,
				{
					Results: [
						{
							Uri: 123,
						},
					],
				},
			];
		});

		let completed = false;

		trimConnector
			.registerInTrim(1, { RecordTypedTitle: "test" })

			.then((data) => {
				completed = true;
			});
		trimConnector.cancel();

		setTimeout(() => {
			expect(completed).toBe(false);
			done();
		});
	});

	it("sends the token with a request", () => {
		let token = "";
		let webUrl = "";
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/RegisterFile`)
			.reply(function(config: any) {
				token = config.headers["Authorization"];
				webUrl = config.params["webUrl"];

				return [200, { Results: [{ Id: "0123", Uri: 567 }] }];
			});

		expect.assertions(4);
		return trimConnector.getDriveId("abc").then((data) => {
			expect(webUrl).toEqual("abc");
			expect(data.Id).toEqual("0123");
			expect(data.Uri).toEqual(567);
			expect(token).toEqual("Bearer token123");
		});
	});

	it("gets the record text", () => {
		let token = "";
		let uri = 0;
		mock.onGet(`${SERVICEAPI_BASE_URI}/GetFile`).reply(function(config: any) {
			token = config.headers["Authorization"];
			uri = config.params["uri"];

			return [200, { File: "test" }];
		});

		expect.assertions(2);
		return trimConnector.getRecordAsText(1).then((data) => {
			expect(uri).toEqual(1);
			expect(data).toEqual("test");
			// expect(data.Uri).toEqual(567);
			// expect(token).toEqual("Bearer token123");
		});
	});

	it("gets command def details", async () => {
		const replyValue = [
			{
				CommandId: "RecDocFinal",
				MenuEntryString: "Final",
				Tooltip: "Make Final",
				StatusBarMessage: "Make Final",
				IsEnabled: true,
			},
		];

		mock
			.onGet(`${SERVICEAPI_BASE_URI}/RegisterFile`)
			.reply(function(config: any) {
				return [
					200,
					{ Results: [{ Id: "0123", Uri: 567, CommandDefs: replyValue }] },
				];
			});

		expect.assertions(2);
		const data = await trimConnector.getDriveId("test");
		expect(data.CommandDefs.length).toEqual(1);
		expect(data.CommandDefs).toEqual(replyValue);
	});

	it("handles an error response without a body", async () => {
		mock.onGet(`${SERVICEAPI_BASE_URI}/RegisterFile`).networkError();

		expect.assertions(1);

		try {
			await trimConnector.getDriveId("");
		} catch (error) {
			expect(error.message).toEqual("Network Error");
		}
	});

	describe("Test object details fetch from TRIM", () => {
		beforeEach(() => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/Record/678`, {
					params: {
						propertySets: "Detailed",
						propertyValue: "Both",
						stringDisplayType: "ViewPane",
						includePropertyDefs: true,
						properties: "ToolTip,NameString",
						descendantProperties: "RecordNumber",
					},
				})
				.reply((config) => {
					return [
						200,
						{
							Results: [
								{
									TrimType: "RecordType",
									RecordTitle: { StringValue: "test" },
									Fields: {
										Visibility: {
											StringValue: "High",
										},
									},
								},
							],
							PropertiesAndFields: {
								Record: [
									{
										Id: "RecordTitle",
										Caption: "Title",
									},
									{
										Id: "Visibility",
										Caption: "Visibility Caption",
									},
								],
							},
						},
					];
				});
		});

		it("requests details in a Record details request", async () => {
			expect.assertions(5);
			const data = await trimConnector.getObjectDetails(
				BaseObjectTypes.Record,
				678
			);
			expect(data.results.length).toBe(1);
			expect(data.propertiesAndFields.length).toBe(2);
			expect(data.results[0].RecordTitle.StringValue).toEqual("test");
			expect(data.propertiesAndFields[0].Caption).toEqual("Title");
			expect(data.propertiesAndFields[0].Id).toEqual("RecordTitle");
		});

		it("handles fields in response", async () => {
			expect.assertions(3);
			const data = await trimConnector.getObjectDetails(
				BaseObjectTypes.Record,
				678
			);

			expect(data.results[0].Fields!.Visibility.StringValue).toEqual("High");
			expect(data.propertiesAndFields[1].Id).toEqual("Visibility");
			expect(data.propertiesAndFields[1].Caption).toEqual("Visibility Caption");
		});
	});

	describe("TRIM Actions", () => {
		let postBody: any;
		beforeEach(() => {
			mock.reset();
			postBody = null;
			mock.onPost(`${SERVICEAPI_BASE_URI}/DriveFile`).reply((config) => {
				postBody = config.data;
				return [200, { Results: [{}] }];
			});
		});

		it("sends a Uri for the Check in", async () => {
			await trimConnector.runAction(CommandIds.RecCheckIn, 786, "", "");
			expect(postBody).toEqual(
				JSON.stringify({
					uri: 786,
					Action: "checkin",
					fileName: "",
					webUrl: "",
				})
			);
		});

		it("sends an action the Set as Final", async () => {
			const expectedResponse = {
				Action: "finalize",
				uri: 999,
			};

			await trimConnector.runAction(CommandIds.RecDocFinal, 999, "", "");
			expect(postBody).toEqual(JSON.stringify(expectedResponse));
		});

		it("sends an action for add to favourites", async () => {
			expect.assertions(1);
			const expectedResponse = {
				Action: "AddToFavorites",
				uri: 9000000001,
			};

			await trimConnector.runAction(
				CommandIds.AddToFavorites,
				9000000001,
				"",
				""
			);
			expect(postBody).toEqual(JSON.stringify(expectedResponse));
		});

		it("sends an action for remove from favourites", async () => {
			expect.assertions(1);
			const expectedResponse = {
				Action: "RemoveFromFavorites",
				uri: 9000000001,
			};

			await trimConnector.runAction(
				CommandIds.RemoveFromFavorites,
				9000000001,
				"",
				""
			);
			expect(postBody).toEqual(JSON.stringify(expectedResponse));
		});
	});
	describe("TRIM child collections", () => {
		let postBody: any;
		beforeEach(() => {
			mock.reset();
			postBody = null;
			mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply((config) => {
				postBody = config.data;
				return [200, { Results: [{}] }];
			});
		});
		it("posts the correct body for add relationship", async () => {
			await trimConnector.createRelationship(1, 2, "IsAltIn");

			expect(postBody).toEqual(
				JSON.stringify({
					Uri: 1,
					ChildRelationships: [
						{
							RecordRelationshipRelationType: "IsAltIn",
							RecordRelationshipRelatedRecord: { Uri: 2 },
						},
					],
				})
			);
		});
	});

	describe("Search Clauses", () => {
		it("returns the search clause definitions", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/SearchClauseDef`)
				.reply(function(config: any) {
					return [
						200,
						{
							SearchClauseDefs: [
								{
									InternalName: "Acl",
									Caption: "test caption",
									ToolTip: "test tooltip",
								},
							],
						},
					];
				});

			expect.assertions(4);
			const data = await trimConnector.getSearchClauseDefinitions(
				BaseObjectTypes.Record
			);

			expect(data.length).toBe(1);
			expect(data[0].Caption).toEqual("test caption");
			expect(data[0].InternalName).toEqual("Acl");
			expect(data[0].ToolTip).toEqual("test tooltip");
		});
	});

	describe("Object Definitions", () => {
		it("returns the object definitions", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/ObjectDef`, {
					params: {
						ObjectType: "Main",
					},
				})
				.reply(function(config: any) {
					return [
						200,
						{
							ObjectDefs: [
								{
									CaptionPlural: "Saved Searches",
									Caption: "Saved Search",
									Abbreviation: "srh",
									Name: "savedSearch",
									Id: "SavedSearch",
								},
							],
							ResponseStatus: {},
						},
					];
				});

			const data = await trimConnector.getObjectDefinitions();

			expect(data.length).toBe(1);
			expect(data[0].Caption).toEqual("Saved Search");
			expect(data[0].CaptionPlural).toEqual("Saved Searches");
			expect(data[0].Id).toEqual("SavedSearch");
			expect.assertions(4);
		});
	});

	describe("Object Caption", () => {
		it("returns the object definitions", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/ObjectDef`, {
					params: {
						ObjectType: "Main",
					},
				})
				.reply(function(config: any) {
					return [
						200,
						{
							ObjectDefs: [
								{
									CaptionPlural: "Saved Searches",
									Caption: "Saved Search",
									Abbreviation: "srh",
									Name: "savedSearch",
									Id: "SavedSearch",
								},
							],
							ResponseStatus: {},
						},
					];
				});

			const data = await trimConnector.getObjectCaption(
				BaseObjectTypes.SavedSearch
			);

			const locationData = await trimConnector.getObjectCaption(
				BaseObjectTypes.Location
			);

			expect(data).toEqual("Saved Search");
			expect(locationData).toEqual("Location");
			expect.assertions(2);
		});
	});

	describe("Database properties", () => {
		it("returns Currency Symbol", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/Database`, {
					params: {
						properties: "DatabaseCurrencySymbol",
					},
				})
				.reply(function(config: any) {
					return [
						200,
						{
							Results: [
								{
									DatabaseCurrencySymbol: { Value: "$" },
									TrimType: "Database",
									Uri: 1,
								},
							],
							PropertiesAndFields: {},
							TotalResults: 0,
							MinimumCount: 0,
							Count: 0,
							HasMoreItems: false,
							TrimType: "Unknown",
							ResponseStatus: {},
						},
					];
				});
			expect.assertions(1);

			const data = await trimConnector.getDatabaseProperties();
			expect(data.CurrencySymbol).toEqual("$");
		});
	});

	describe("User Options", () => {
		it("returns the search user options", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/UserOptions/Search`)
				.reply(function(config: any) {
					return [
						200,
						{
							UserOptions: {
								__type:
									"HP.HPTRIM.ServiceModel.SearchUserOptions, HP.HPTRIM.ServiceAPI.Model",
								SearchUserOptionsStartPointForContainers: {
									Value: "Containers",
									StringValue: "Recent Containers",
								},
								SearchUserOptionsStartPointForDocuments: {
									Value: "RecentDocs",
									StringValue: "Recent Documents",
								},
								SearchUserOptionsStartPointForLocations: {
									Value: "Favorites",
									StringValue: "Favorite Items",
								},
								SearchUserOptionsStartPointRecordDefault: {
									Value: "FavRecords",
									StringValue: "Favorite records",
								},
								SearchUserOptionsStartPointDefault: {
									Value: "All",
									StringValue: "All Items",
								},
								SearchUserOptionsIncludeAlternateWhenShowingFolderContents: {
									Value: false,
									StringValue: "No",
								},
								SearchUserOptionsContentsInReverseDateOrder: {
									Value: true,
									StringValue: "Yes",
								},
							},
						},
					];
				});
			expect.assertions(3);

			const data = await trimConnector.getSearchOptions();
			expect(data.StartPointForContainers).toEqual("Containers");
			expect(data.StartPointForLocations).toEqual("Favorites");
			expect(data.ContentsInReverseDateOrder).toBe(true);
		});
	});
});
