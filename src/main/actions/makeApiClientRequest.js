import getProxiedAxios from "./getProxiedAxios";
import AdvancedFormData from "form-data";

const fs = require("fs");

const makeApiClientRequest = async ({ apiRequest }) => {
  try {
    const { method = "GET" } = apiRequest;
    let headers = {};
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

    if (apiRequest.body && apiRequest.contentType === "multipart/form-data") {
      const formData = new AdvancedFormData();
      apiRequest.body.forEach(({ key, value }) => {
        if (Array.isArray(value)) {
          const files = value.map((entry) =>  {
            const stream = entry?.path ? fs.createReadStream(entry.path) : null;
            if(stream) {
              return {
                stream,
                fileName: entry.name || entry.path.split("/").pop(),
              };
            }
            return null;
          }).filter(Boolean)
          files.forEach(({stream, fileName}) => {
            try {
              formData.append(key, stream, fileName);
            } catch (error) {
              console.error(`Error appending file to formData for key ${key}:`, error);
            }
          });
        } else {
          formData.append(key, value);
        }
      });
      body = formData;
      headers = {
        'content-type': `${formData.getHeaders()}`,
        ...headers,
      }
    }

    const requestStartTime = performance.now();
    const axios = getProxiedAxios(apiRequest.includeCredentials);
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
