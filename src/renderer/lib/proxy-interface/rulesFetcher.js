import { getState } from "../../actions/stateManagement";

class RulesDataSource {
  getRules = async (requestHeaders) => {
    console.log("Interface getRules");
    let rules = getState("rulesCache") || [];
    return rules;
  };

  getGroups = async (requestHeaders) => {
    console.log("Interface getGroups");
    let groups = getState("groupsCache") || [];
    return groups;
  };
}

export default RulesDataSource;
