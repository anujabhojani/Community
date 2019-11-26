(global as any).config = { BASE_URL: "" };

import * as React from "react";
import { mount, shallow } from "enzyme";
import { NewRecord } from "./NewRecord";
import { PrimaryButton } from "office-ui-fabric-react/lib/Button";
import { Dropdown } from "office-ui-fabric-react/lib/Dropdown";
import { TrimConnector } from "../trim-coms/trim-connector";
import { IRecordType, ITrimMainObject } from "../trim-coms/trim-connector";
import { PropertySheet } from "./PropertySheet";
import { IOfficeConnector } from "../office-coms/office-connector";

describe("New Record layout", function() {
	let resolveRecordTypes;
	let testRecordUrn = "";

	beforeEach(() => {
		testRecordUrn = "";
	});

	let mockTrimConnector = new TrimConnector();
	mockTrimConnector.search = () => {
		return new Promise(function(resolve) {
			resolveRecordTypes = resolve;
		});
	};

	mockTrimConnector.getPropertySheet = () => {
		return new Promise(function(resolve) {
			resolve({ PageItems: [] });
		});
	};

	const mockStore = {
		RecordUri: 0,
		RecordProps: {},
		messages: {
			web_Register: "Register",
			web_SelectRecordType: "Select a Record Type",
		},
		documentInfo: { Options: {}, URN: "test_urn" },
		createRecord: (recordUri, recordProps) => {
			mockStore.RecordUri = recordUri;
			mockStore.RecordProps = recordProps;

			return new Promise(function(resolve) {
				resolve();
			});
		},
		FileName: "default title",
	};

	class MockWordConnector implements IOfficeConnector {
		insertLink(textToInsert: string, url: string): void {
			throw new Error("Method not implemented.");
		}
		saveDocument(): Promise<void> {
			throw new Error("Method not implemented.");
		}
		getDocumentData(writeSlice: any): Promise<string> {
			throw new Error("Method not implemented.");
		}
		setAutoOpen(autoOpen: boolean, recordUrn: string): void {
			console.log(recordUrn);
			testRecordUrn = recordUrn;
		}
		getAutoOpen(): boolean {
			throw new Error("Method not implemented.");
		}
		insertText(textToInsert: string): void {
			throw new Error("Method not implemented.");
		}
		getAccessToken(): Promise<string> {
			throw new Error("Method not implemented.");
		}
		setUri(
			uri: number
		): Promise<import("../office-coms/word-connector").IGetRecordUriResponse> {
			throw new Error("Method not implemented.");
		}
		getWebUrl(): Promise<string> {
			throw new Error("Method not implemented.");
		}
		getUri(): Promise<
			import("../office-coms/word-connector").IGetRecordUriResponse
		> {
			throw new Error("Method not implemented.");
		}
	}

	const wrapper = shallow<NewRecord>(
		<NewRecord
			appStore={mockStore}
			trimConnector={mockTrimConnector}
			wordConnector={new MockWordConnector()}
		/>
	);

	it("contains a Record Type dropdown", async (done) => {
		resolveRecordTypes({
			results: [{ Uri: 1, NameString: "Document" } as IRecordType],
		});

		expect(wrapper.find(Dropdown).exists()).toBeTruthy();
		expect(wrapper.find(Dropdown).props().placeholder).toEqual(
			"Select a Record Type"
		);
		setImmediate(() => {
			expect(
				wrapper
					.update()
					.find(Dropdown)
					.props().options
			).toEqual([{ key: 1, text: "Document" }]);
			done();
		});
	});

	it("contains a button", () => {
		expect(wrapper.find(PrimaryButton).exists()).toBeTruthy();
		expect(
			wrapper
				.find(PrimaryButton)
				.childAt(0)
				.text()
		).toMatch("Register");
	});

	it("Sets the Record Type Uri from on load and onChange", () => {
		const instance = wrapper.instance();
		instance.setRecordTypes([]);

		expect(instance.recordTypeUri).toEqual(0);

		// should be zero after the record types list has been changed
		instance.setRecordTypes([
			{ key: 1, text: "Document" },
			{ key: 5, text: "Document 5" },
		]);
		wrapper
			.update()
			.find(Dropdown)
			.props()
			.onChange(null, null, 1);

		instance.setRecordTypes([{ key: 1, text: "Document" }]);

		expect(instance.recordTypeUri).toEqual(0);

		wrapper
			.update()
			.find(Dropdown)
			.props()
			.onChange(null, null, 0);

		expect(instance.recordTypeUri).toEqual(1);
	});

	it("calls create record on button press", () => {
		const instance = wrapper.instance();
		instance.setRecordTypes([
			{ key: 1, text: "Document" },
			{ key: 5, text: "Document 5" },
		]);

		wrapper
			.update()
			.find(Dropdown)
			.props()
			.onChange(null, null, 0);

		wrapper
			.update()
			.find(PrimaryButton)
			.props()
			.onClick(null);

		expect(mockStore.RecordUri).toEqual(1);
	});

	it("sends the default on click even if no fields on the form have been modified", () => {
		const instance = wrapper.instance();
		instance.setRecordTypes([
			{ key: 1, text: "Document" },
			{ key: 5, text: "Document 5" },
		]);

		wrapper
			.update()
			.find(PrimaryButton)
			.props()
			.onClick(null);

		expect(mockStore.RecordProps).toEqual({
			RecordTypedTitle: "default title",
		});
	});

	it("sends updated properties button press", () => {
		const instance = wrapper.instance();
		instance.setRecordTypes([
			{ key: 1, text: "Document" },
			{ key: 5, text: "Document 5" },
		]);

		// wrapper
		//   .update()
		//   .find(Dropdown)
		//   .props()
		//   .onChange(null, null, 0);

		wrapper
			.update()
			.find(PropertySheet)
			.props()
			.onChange({ RecordTypedTitle: "test title" });

		wrapper
			.update()
			.find(PrimaryButton)
			.props()
			.onClick(null);

		expect(mockStore.RecordProps).toEqual({ RecordTypedTitle: "test title" });
	});

	it("sends record URN to auto open", (done) => {
		const instance = wrapper.instance();
		instance.setRecordTypes([
			{ key: 1, text: "Document" },
			{ key: 5, text: "Document 5" },
		]);

		wrapper
			.update()
			.find(PrimaryButton)
			.props()
			.onClick(null);

		setTimeout(() => {
			try {
				expect(testRecordUrn).toEqual("test_urn");
				done();
			} catch (e) {
				done.fail(e);
			}
		});
	});

	it("displays a property sheet when Record Type is set", async (done) => {
		const shallowWrapper = shallow<NewRecord>(
			<NewRecord
				appStore={mockStore}
				trimConnector={mockTrimConnector}
				wordConnector={new MockWordConnector()}
			/>
		);

		const instance = wrapper.instance();
		// no property sheet before recordtype uri sey
		expect(wrapper.find(PropertySheet).exists()).toBeTruthy();

		wrapper
			.update()
			.find(Dropdown)
			.props()
			.onChange(null, null, 1);

		setImmediate(() => {
			//expect(wrapper.find(PropertySheet).exists()).toBeTruthy();
			expect(instance.formDefinition).toEqual({ PageItems: [] });
			expect(
				wrapper
					.update()
					.find(PropertySheet)
					.props().formDefinition
			).toEqual({ PageItems: [] });
			done();
		});
	});
});
