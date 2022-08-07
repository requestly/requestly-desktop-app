import { ISource, SSLProxyingJsonObj } from "lib/storage/types/ssl-proxying";
import BaseConfigFetcher from "renderer/lib/proxy-interface/base";
// TODO: @sahil fix this by adding type.d.ts file
//@ts-ignore
import { RULE_PROCESSOR } from "@requestly/requestly-core";

class SSLProxyingManager {
  configFetcher: BaseConfigFetcher;

  constructor(configFetcher: BaseConfigFetcher) {
    this.configFetcher = configFetcher;
  }

  isSslProxyingActive = (urlOrigin: string): boolean => {
    const config: SSLProxyingJsonObj = this.configFetcher.getConfig();

    if (config.enabledAll === false) {
      const inclusionListSuccess: boolean = this.checkStatusWithInclusionList(
        config,
        urlOrigin
      );
      if (inclusionListSuccess) {
        console.log(`${urlOrigin} inclusion List`);
        return true;
      }

      return false;
    } else {
      const exclusionListSuccess: boolean = this.checkStatusWithExclusionList(
        config,
        urlOrigin
      );
      if (exclusionListSuccess) {
        console.log(`${urlOrigin} exclusion List`);
        return false;
      }

      return true;
    }
  };

  checkStatusWithInclusionList = (
    config: SSLProxyingJsonObj,
    urlOrigin: string
  ): boolean => {
    const inclusionListSources: ISource[] = Object.values(
      config.inclusionList || {}
    );
    return this.checkStatusWithList(inclusionListSources, urlOrigin);
  };

  checkStatusWithExclusionList = (
    config: SSLProxyingJsonObj,
    urlOrigin: string
  ): boolean => {
    const exclusionListSources: ISource[] = Object.values(
      config.exclusionList || {}
    );
    return this.checkStatusWithList(exclusionListSources, urlOrigin);
  };

  checkStatusWithList = (
    sourceObjs: ISource[] = [],
    urlOrigin: string = ""
  ): boolean => {
    return sourceObjs.some((sourceObj) =>
      this.checkStatusForSource(sourceObj, urlOrigin)
    );
  };

  checkStatusForSource = (
    sourceObject: ISource,
    urlOrigin: string
  ): boolean => {
    const result = RULE_PROCESSOR.RuleMatcher.matchUrlWithRuleSource(
      sourceObject,
      urlOrigin
    );
    if (result === "") {
      return true;
    }
    return false;
  };
}

export default SSLProxyingManager;
