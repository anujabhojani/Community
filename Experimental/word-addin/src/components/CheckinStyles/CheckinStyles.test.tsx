import * as React from "react";
import { shallow, mount } from "enzyme";
import { CheckinStyles } from "./CheckinStyles";
import { TrimConnector } from "../../trim-coms/trim-connector";
import ContextList from "../ContextList/ContextList";
import NewRecord from "../NewRecord";
import OutlookFolderPicker from "../OutlookFolderPicker/OutlookFolderPicker";

jest.mock("../../office-coms/OutlookConnector");

describe("Check in Styles", function() {
	let testUri = 0;
	let recordUri = 0;
	let testError = "";
	let testText = "";
	let trimConnector = new TrimConnector();
	trimConnector.credentialsResolver = (callback) => {};

	trimConnector.getMessages = function() {
		return { bob_needSelectedRow: "test {0}" };
	}.bind(trimConnector);

	trimConnector.getObjectDefinitions = function() {
		return new Promise((resolve) => {
			resolve([{ Id: "Record", Caption: "Record" }]);
		});
	}.bind(trimConnector);

	const mockWordConnector = {
		insertText(textToInsert: string): void {
			testText = textToInsert;
		},
	};

	const mockAppStore = {
		fetchBaseSettingFromTrim: null,
		resetError: null,
		messages: { web_Please_Select: "Please select a Record." },
		status: "",
		setError: function(message: any) {
			testError = message;
		},
		setErrorMessage: function(message) {
			testError = message;
		},
		openInCM: function(uri: number) {
			testUri = uri;
		},
		RecordUri: recordUri,
		documentInfo: {
			Enums: {
				RecordRelationshipType: [{ Id: "Related", Caption: "Related" }],
			},
		},
	};

	it("fire command", () => {
		let firedCommand;
		const wrapper = shallow<CheckinStyles>(
			<CheckinStyles
				appStore={mockAppStore}
				trimConnector={trimConnector}
				forServerProcessing={true}
			/>
		);

		wrapper
			.find(ContextList)
			.props()
			.onCommand("New");

		expect(wrapper.state().view).toEqual("New");
	});

	it("send computed props to PropertySheet", () => {
		let firedCommand;
		const wrapper = shallow<CheckinStyles>(
			<CheckinStyles
				appStore={mockAppStore}
				trimConnector={trimConnector}
				forServerProcessing={true}
			/>
		);

		wrapper
			.find(ContextList)
			.props()
			.onCommand("New");

		expect(wrapper.find(NewRecord).exists()).toBeTruthy();
	});

	it("state re-set after record created", (done) => {
		let firedCommand;
		const wrapper = shallow<CheckinStyles>(
			<CheckinStyles
				appStore={mockAppStore}
				trimConnector={trimConnector}
				forServerProcessing={true}
			/>
		);

		wrapper
			.find(ContextList)
			.props()
			.onCommand("New");

		wrapper
			.find(NewRecord)
			.props()
			.onTrimObjectCreated({ Uri: 0 });
		setTimeout(() => {
			try {
				expect(wrapper.state().view).toEqual("List");
				done();
			} catch (e) {
				done.fail(e);
			}
		});
	});

	it("Create Linked folder contains OutlookFolderPicker", () => {
		const wrapper = shallow<CheckinStyles>(
			<CheckinStyles
				forServerProcessing={true}
				appStore={mockAppStore}
				trimConnector={trimConnector}
			/>
		);

		wrapper
			.find(ContextList)
			.props()
			.onCommand("New");

		expect(wrapper.find(OutlookFolderPicker).exists()).toBeTruthy();
	});

	it("Create Check in Style folder does not contain OutlookFolderPicker", () => {
		const wrapper = shallow<CheckinStyles>(
			<CheckinStyles
				appStore={mockAppStore}
				trimConnector={trimConnector}
				forServerProcessing={false}
			/>
		);

		wrapper
			.find(ContextList)
			.props()
			.onCommand("New");

		expect(wrapper.find(OutlookFolderPicker).exists()).toBeFalsy();
	});

	it("folder id set enables New Record", () => {
		const wrapper = shallow<CheckinStyles>(
			<CheckinStyles
				appStore={mockAppStore}
				trimConnector={trimConnector}
				forServerProcessing={true}
			/>
		);

		wrapper
			.find(ContextList)
			.props()
			.onCommand("New");

		wrapper
			.find(OutlookFolderPicker)
			.props()
			.onChange("abc");

		expect(wrapper.find(NewRecord).props().folderId).toEqual("abc");
		expect(wrapper.find(NewRecord).props().isLinkedFolder).toBeTruthy();
	});

	it("isLinked folder not set for client side processing", () => {
		const wrapper = shallow<CheckinStyles>(
			<CheckinStyles
				appStore={mockAppStore}
				trimConnector={trimConnector}
				forServerProcessing={false}
			/>
		);

		wrapper
			.find(ContextList)
			.props()
			.onCommand("New");

		expect(wrapper.find(NewRecord).props().isLinkedFolder).toBeFalsy();
	});
});
