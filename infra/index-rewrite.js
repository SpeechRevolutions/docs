// CloudFront Function (viewer-request) for the docs distribution.
//
// The bucket is private and reached through Origin Access Control, so S3 does no
// index-document handling: CloudFront's default root object covers "/" and
// nothing else. With `trailingSlash: true` the export writes `sdks/python/index.html`,
// so a request for `/sdks/python/` has to be rewritten to that key, and a request
// for `/sdks/python` redirected to the slashed form so relative links resolve.
//
// Runtime is cloudfront-js-2.0. Deployed by hand; see infra/README.md.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
    return request;
  }

  // Anything with an extension is a real file: assets, llms.txt, sitemap.xml.
  var last = uri.substring(uri.lastIndexOf("/") + 1);
  if (last.indexOf(".") !== -1) {
    return request;
  }

  var qs = Object.keys(request.querystring)
    .map(function (k) {
      var v = request.querystring[k];
      return v.value ? k + "=" + v.value : k;
    })
    .join("&");

  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: {
      location: { value: uri + "/" + (qs ? "?" + qs : "") },
      "cache-control": { value: "public, max-age=3600" },
    },
  };
}
