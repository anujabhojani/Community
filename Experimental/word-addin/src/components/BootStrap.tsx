import * as React from "react";
//import { IAppStore } from "../stores/AppStore";
import { inject, observer } from "mobx-react";
import ErrorDisplay from "./ErrorDisplay";
import MainApp from "./MainApp";
//import { BrowserRouter as Router, Route } from "react-router-dom";
import { TrimSearchDialog } from "./TrimSearchDialog/TrimSearchDialog";
import { BaseObjectTypes } from "../../src/trim-coms/trim-baseobjecttypes";
import { ITrimConnector } from "src/trim-coms/trim-connector";
import { Spinner, SpinnerSize } from "office-ui-fabric-react/lib/Spinner";
import { IAppStore } from "src/stores/AppStore";

import { getQueryStringValue } from "../utils/getQueryStringValue";

interface IProps {
	appStore?: IAppStore;
	trimConnector?: ITrimConnector;
}

export class BootStrap extends React.Component<
	IProps,
	{ dialogName: string; filter: string; insertText: boolean }
> {
	constructor(props: IProps) {
		super(props);

		let filter = "";
		let insertText = false;
		try {
			filter = getQueryStringValue("filter") || "";
			insertText = getQueryStringValue("insert") ? true : false;
		} catch {
			// I only have this try/catch to make the tests work
		}

		if (window.location.search.indexOf("searchdialog") > -1) {
			this.state = {
				dialogName: "/searchdialog",
				filter: filter,
				insertText: insertText,
			};
		} else {
			this.state = { dialogName: "", filter: filter, insertText: false };
		}
	}

	componentDidMount() {
		const { appStore, trimConnector } = this.props;
		const { dialogName } = this.state;
		Office.initialize = function(reason) {
			appStore!.fetchBaseSettingFromTrim(dialogName === "/searchdialog");
		};

		window.onbeforeunload = () => {
			trimConnector!.clearCache();
		};
	}
	// private _onChange = (ev: React.MouseEvent<HTMLElement>, checked: boolean) => {
	// 	const { wordConnector } = this.props;
	// 	wordConnector!.setAutoOpen(checked);
	// 	//console.log('toggle is ' + (checked ? 'checked' : 'not checked'));
	// };
	public render() {
		const { appStore, trimConnector } = this.props;

		return (
			<div>
				{appStore!.status === "ERROR" && <ErrorDisplay />}

				{this.state.dialogName === "/searchdialog" ? (
					<TrimSearchDialog
						trimType={BaseObjectTypes.Record}
						trimConnector={trimConnector}
						startPoint="RecentDocs"
						appStore={appStore}
						filterSearch={this.state.filter}
						insertText={this.state.insertText}
					/>
				) : (
					<React.Fragment>
						{appStore!.status === "STARTING" && (
							<Spinner size={SpinnerSize.large} />
						)}
						<MainApp className="trim-main" />
					</React.Fragment>
				)}
			</div>
		);
	}
}

export default inject("appStore", "trimConnector")(observer(BootStrap));
