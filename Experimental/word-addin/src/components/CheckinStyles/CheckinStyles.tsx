import * as React from "react";
import { inject, observer } from "mobx-react";

import ErrorDisplay from "../ErrorDisplay";
import { IAppStore } from "../../stores/AppStoreBase";
import ContextList from "../ContextList/ContextList";
import BaseObjectTypes from "../../trim-coms/trim-baseobjecttypes";
import { ITrimConnector } from "../../trim-coms/trim-connector";
import NewRecord from "../NewRecord";
import OutlookFolderPicker from "../OutlookFolderPicker/OutlookFolderPicker";
import { mergeStyles } from "@uifabric/styling";
import { OutlookConnector } from "../../office-coms/OutlookConnector";

interface ICheckinStylesProps {
	appStore?: IAppStore;
	trimConnector?: ITrimConnector;
	forServerProcessing: boolean;
}

interface ICheckinStylesState {
	view: string;
	folderId: string;
}

export class CheckinStyles extends React.Component<
	ICheckinStylesProps,
	ICheckinStylesState
> {
	constructor(props: ICheckinStylesProps) {
		super(props);

		this.state = {
			view: "List",
			folderId: "",
		};
	}

	private getStyles(): string {
		return mergeStyles({
			selectors: {
				"& .ms-ComboBox": {
					marginBottom: "8px",
				},
			},
		});
	}

	public render() {
		const { appStore, forServerProcessing } = this.props;
		const { view, folderId } = this.state;

		return (
			<div>
				{appStore!.status === "ERROR" && <ErrorDisplay />}
				{view === "New" ? (
					<React.Fragment>
						{forServerProcessing && (
							<OutlookFolderPicker
								className={this.getStyles()}
								onChange={(folderId) => {
									this.setState({ folderId: folderId });
								}}
							/>
						)}
						<NewRecord
							trimType={BaseObjectTypes.CheckinStyle}
							folderId={folderId}
							onTrimObjectCreated={(trimObject) => {
								const connector = new OutlookConnector();
								connector.getFolderChangeKey(folderId).then((changeKey) => {
									connector.setUrnOnFolder(
										folderId,
										changeKey,
										trimObject!.URN!
									);
									this.setState({ view: "List" });
								});
							}}
							validateRecordType={(recordTypeUri) => {
								const { trimConnector } = this.props;
								return new Promise<Boolean>(function(resolve) {
									trimConnector!
										.isDataEntryFormNeeded(recordTypeUri)
										.then(function(isValid) {
											resolve(!isValid);
										});
								});
							}}
						/>
					</React.Fragment>
				) : (
					<ContextList
						trimType={BaseObjectTypes.CheckinPlace}
						hideSearchBar={true}
						searchString={
							forServerProcessing
								? "cipType:MailForServerProcessing"
								: "cipType:MailForClientProcessing"
						}
						onCommand={(key: string) => {
							this.setState({ view: key });
						}}
					/>
				)}
			</div>
		);
	}
}

export default inject("appStore", "trimConnector")(observer(CheckinStyles));
