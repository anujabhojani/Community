import * as React from "react";
import { shallow } from "enzyme";
import { BootStrap } from "./BootStrap";
import MainApp from "../MainApp";
import ErrorDisplay from "../ErrorDisplay";

describe("BootStrap", function() {
	const mockWordConnector = {
		getAutoOpen(): boolean {
			return false;
		},
	};

	it("shows error component", function() {
		const wrapper = shallow(
			<BootStrap
				appStore={{
					status: "ERROR",
					errorMessage: "test",
					fetchBaseSettingFromTrim: () => {},
					messages: { web_HPRM: "CM" },
				}}
				trimConnector={{}}
			/>
		);
		//   expect(wrapper).toMatchSnapshot();
		expect(wrapper.find(ErrorDisplay).exists()).toBeTruthy();
		//expect(wrapper.find("ErrorDisplay"));
		//  expect(wrapper.find("div"));
	});

	//   beforeEach(function(this: any) {
	//     this.appStore = { status: "WAITING" };
	//   });

	it("shows Main component", function() {
		const wrapper = shallow(
			<BootStrap
				appStore={{
					status: "WAITING",
					fetchBaseSettingFromTrim: () => {},
				}}
				trimConnector={{}}
			/>
		);

		expect(wrapper.find(MainApp).exists()).toBeTruthy();
		//expect(wrapper.find("ErrorDisplay"));
		//  expect(wrapper.find("div"));
	});
});
