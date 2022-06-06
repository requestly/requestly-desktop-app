import { getState } from "../../actions/stateManagement";

class RulesDataSource {
  getRules = async (requestHeaders) => {
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
