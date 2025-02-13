import getProxiedAxios from "./getProxiedAxios";

const makeApiClientRequest = async ({ apiRequest }) => {
  try {
    const { method = "GET" } = apiRequest;
    const headers = {};
    let { body, url } = apiRequest;

    if (apiRequest?.queryParams.length) {
      const urlObj = new URL(apiRequest.url);
      const searchParams = new URLSearchParams(urlObj.search);
      apiRequest.queryParams.forEach(({ key, value }) => {
        searchParams.append(key, value);
      });
      urlObj.search = searchParams.toString();
      url = urlObj.toString();
    }

    apiRequest?.headers.forEach(({ key, value }) => {
      headers[key] = value;
    });

    if (
      !["GET", "HEAD"].includes(method) &&
      apiRequest.contentType === "application/x-www-form-urlencoded"
    ) {
      const formData = new FormData();
      body?.forEach(({ key, value }) => {
        formData.append(key, value);
      });
      body = new URLSearchParams(formData);
    }

    const requestStartTime = performance.now();
    const axios = getProxiedAxios();
    const response = await axios({
      url,
      method,
      headers,
      data: body,
      responseType: "arraybuffer",
      withCredentials: false,
      validateStatus: () => {
        return true;
      },
    });
    const responseTime = performance.now() - requestStartTime;

    const responseHeaders = [];
    Object.entries(response.headers).forEach(([key, value]) => {
      responseHeaders.push({ key, value });
    });

    const contentType = responseHeaders.find(
      (header) => header.key.toLowerCase() === "content-type"
    )?.value;

    let responseBody;

    if (contentType?.includes("image/")) {
      const raw = Buffer.from(response.data).toString("base64");
      responseBody = `data:${contentType};base64,${raw}`;
    } else {
      responseBody = new TextDecoder().decode(response.data);
    }

    const responseURL = response.request?.res?.responseUrl;

    return {
      body: responseBody,
      time: responseTime,
      headers: responseHeaders,
      status: response.status,
      statusText: response.statusText,
      redirectedUrl: responseURL !== url ? responseURL : "",
    };
  } catch (e) {
    console.log("Error while making api client request", e);
    return {
      error: e.message,
    };
  }
};

export default makeApiClientRequest;
