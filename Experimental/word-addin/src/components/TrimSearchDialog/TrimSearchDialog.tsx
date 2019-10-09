import * as React from "react";
import "./TrimSearchDialog.css";
import {
	ITrimSearchDialogProps,
	ITrimSearchDialog,
} from "./TrimSearchDialog.types";
import { FocusTrapZone } from "office-ui-fabric-react/lib/FocusTrapZone";
import TrimObjectSearchList from "../TrimObjectSearchList/TrimObjectSearchList";
import { createRef } from "office-ui-fabric-react/lib/Utilities";
import { ITrimObjectSearchList } from "../TrimObjectSearchList/TrimObjectSearchList.types";
import { ITrimMainObject } from "src/trim-coms/trim-connector";
import {
	PrimaryButton,
	DefaultButton,
} from "office-ui-fabric-react/lib/Button";
import { inject } from "mobx-react";
import BaseObjectTypes from "../../trim-coms/trim-baseobjecttypes";
import { debounce } from "throttle-debounce";
import { Spinner, SpinnerSize } from "office-ui-fabric-react/lib/Spinner";
import SearchBar from "../SearchBar/SearchBar";

export interface ITrimSearchDialogState {
	isObjectPickerShown?: boolean;
	selectedItems: ITrimMainObject[];
	searchStartPoint: string;
	includeAlternateWhenShowingFolderContents: boolean;
	textFieldText: string;
	contentsInReverseDateOrder: boolean;
	advancedSearch: boolean;
	textSearchHelp: string;
	advancedSearchHelp: string;
	isRunning: boolean;
	navTrimType: BaseObjectTypes;
}

export class TrimSearchDialog
	extends React.Component<ITrimSearchDialogProps, ITrimSearchDialogState>
	implements ITrimSearchDialog {
	autocompleteSearchDebounced: any;

	private _searchList = createRef<ITrimObjectSearchList>();

	constructor(props: ITrimSearchDialogProps) {
		super(props);
		this.state = this._getDefaultState();

		this.autocompleteSearchDebounced = debounce(500, this.__textChanged);
	}

	componentDidMount() {
		const { trimConnector, trimType, startPoint } = this.props;
		const startSearches = {
			Containers: "recMyContainers",
			FavRecords: "unkFavorite",
			Favorites: "unkFavorite",
			All: "unkAll",
			ContentBlocks: "recMyContent",
			Templates: "recMyTemplates",
			DueOrIn: "recDueOrInTray",
			In: "recInTray",
			Due: "recDueTray",
			Search: "unkFavorite",
			Offline: "unkFavorite",
			RecentDocs: "recMyDocuments",
			ClassBrowser: "unkFavorite",
			Worktray: "recWorkTray",
			Top: "unkTop",
		};

		trimConnector!.getMessages().then((messages) => {
			this.setState({
				textSearchHelp: messages.web_GoToTextSearch,
				advancedSearchHelp: messages.web_GoToAdvancedSearch,
			});
		});

		trimConnector!.getSearchOptions().then((data) => {
			let key =
				{
					[BaseObjectTypes.Record]: data.StartPointRecordDefault,
					[BaseObjectTypes.Location]: data.StartPointForLocations,
					[BaseObjectTypes.LookupItem]: "Top",
				}[trimType] || data.StartPointDefault;

			const startSearch = startSearches[startPoint || key] || "unkFavorite";

			this.setState({
				searchStartPoint: startSearch,
				includeAlternateWhenShowingFolderContents:
					data.IncludeAlternateWhenShowingFolderContents,
				contentsInReverseDateOrder: data.ContentsInReverseDateOrder,
			});
		});
		//	}
	}

	public render(): JSX.Element {
		const {
			trimType,
			purpose,
			purposeExtra,
			filter,
			trimConnector,
			appStore,
			filterSearch,
		} = this.props;
		const {
			isRunning,
			searchStartPoint,
			textFieldText,
			contentsInReverseDateOrder,
			includeAlternateWhenShowingFolderContents,
			navTrimType,
		} = this.state;

		const startSearchAt = textFieldText || searchStartPoint;

		return (
			<div className="dialog-top">
				{isRunning === true ? (
					<Spinner size={SpinnerSize.large} />
				) : (
					<React.Fragment>
						<SearchBar
							trimType={navTrimType}
							onQueryChange={this.changeQuery}
							includeShortCuts={false}
							wideDisplay={true}
						/>
						<div className="trim-list-clear-float" />
						{startSearchAt && (
							<FocusTrapZone
								isClickableOutsideFocusTrap={true}
								className="dialog-list"
								data-is-scrollable="true"
							>
								<TrimObjectSearchList
									componentRef={this._searchList}
									trimType={trimType}
									onTrimObjectSelected={this._trimObjectSelected}
									q={startSearchAt}
									purpose={purpose}
									purposeExtra={purposeExtra}
									filter={filter}
									filterSearch={filterSearch}
									includeAlternateWhenShowingFolderContents={
										includeAlternateWhenShowingFolderContents
									}
									contentsInReverseDateOrder={contentsInReverseDateOrder}
									advancedSearch={true}
									dialogDisplay={true}
									onTrimTypeChanged={(newTrimType) => {
										this.setState({ navTrimType: newTrimType });
									}}
								/>
							</FocusTrapZone>
						)}
					</React.Fragment>
				)}
				<div className="dialog-footer">
					<div>
						<DefaultButton
							data-automation-id="cancel"
							allowDisabledFocus={true}
							disabled={!startSearchAt}
							text="Cancel"
							onClick={() => {
								Office.context.ui.messageParent("0");
							}}
						/>

						<PrimaryButton
							data-automation-id="ok"
							disabled={!startSearchAt}
							text="OK"
							onClick={() => {
								const { selectedItems } = this.state;
								this.setState({ isRunning: true });
								if (selectedItems.length > 0) {
									const fn = filterSearch ? "getRecordAsText" : "getDriveUrl";

									trimConnector!
										[fn](selectedItems[0].Uri)
										.then((response: string) => {
											Office.context.ui.messageParent(response);
										})
										// .finally(() => {
										// 	this.setState({ isRunning: false });
										// })
										.catch((error) => {
											appStore!.setError(error);
										});
								} else {
									Office.context.ui.messageParent("0");
								}
							}}
							allowDisabledFocus={true}
						/>
					</div>
				</div>
			</div>
		);
	}

	private _trimObjectSelected = (trimObject: ITrimMainObject): void => {
		//const { onTrimObjectSelected } = this.props;
		this.setState({
			selectedItems: [trimObject],
			// 	textFieldText: "",
		});
		// if (onTrimObjectSelected) {
		// 	onTrimObjectSelected(trimObject);
		// }
	};

	private changeQuery = (newText: string): void => {
		this.autocompleteSearchDebounced(newText);
	};

	private __textChanged = (newText: string): void => {
		this.setState({ textFieldText: newText });
		if (!this.state.isObjectPickerShown && newText.length > 2) {
			this._onTextFieldClick();
		}
	};

	private _onTextFieldClick = (): void => {};

	private _getDefaultState(): ITrimSearchDialogState {
		const { value, trimType } = this.props;

		return {
			isRunning: false,
			isObjectPickerShown: false,
			selectedItems: value || [],
			searchStartPoint: "",
			includeAlternateWhenShowingFolderContents: false,
			textFieldText: "",
			contentsInReverseDateOrder: false,
			advancedSearch: false,
			textSearchHelp: "",
			advancedSearchHelp: "",
			navTrimType: trimType,
		};
	}
}

export default inject("appStore", "trimConnector")(TrimSearchDialog);
