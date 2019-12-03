import { IBaseProps } from "office-ui-fabric-react/lib/Utilities";
import {
	ITrimConnector,
	ITrimMainObject,
} from "../../trim-coms/trim-connector";
import BaseObjectTypes from "src/trim-coms/trim-baseobjecttypes";
import { IAppStore } from "src/stores/AppStoreBase";

export interface ITrimObjectSearchList {
	/** Reset the state of the picker to the default */
	reset(): void;
}

export interface ITrimObjectSearchListProps
	extends IBaseProps<ITrimObjectSearchList>,
		React.HTMLAttributes<HTMLElement> {
	/**
	 * TRIM search query
	 */
	q?: string;

	trimType?: BaseObjectTypes;
	appStore?: IAppStore;

	purpose?: number;
	purposeExtra?: number;

	trimConnector?: ITrimConnector;
	includeAlternateWhenShowingFolderContents: boolean;
	contentsInReverseDateOrder: boolean;
	advancedSearch?: boolean;
	filter?: string;
	dialogDisplay?: boolean;
	filterSearch?: string;
	excludeShortCuts?: boolean;

	/**
	 * Callback issued when search is closed
	 */
	onDismiss?: () => void;

	/** Callback for when a given trim object has been selected */
	onTrimObjectSelected?: (
		item?: ITrimMainObject,
		isDoubleClick?: boolean
	) => void;

	onTrimTypeChanged?: (newTrimType: BaseObjectTypes) => void;
}
