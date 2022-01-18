export const handler = async (event: any) => {
  let response = event.Records[0].cf.response;
  let headers = response.headers;

  const headerNameSrc = "X-Amz-Meta-Last-Modified";
  const headerNameDst = "Last-Modified";
  if (headers[headerNameSrc.toLowerCase()]) {
    headers[headerNameDst.toLowerCase()] = [
      {
        key: headerNameDst,
        value: headers[headerNameSrc.toLowerCase()][0].value,
      },
    ];
    console.log(
      `Response header ${headerNameDst} was set to ${
        headers[headerNameDst.toLowerCase()][0].value
      }`
    );
  }

  const headerHSTS = "Strict-Transport-Security";
  headers[headerHSTS.toLowerCase()] = [
    {
      key: headerHSTS,
      value: "max-age=31536000",
    },
  ];

  const headerCSP = "Content-Security-Policy";
  headers[headerCSP.toLowerCase()] = [
    {
      key: headerCSP,
      value:
        "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self';",
    },
  ];

  const headerXFO = "X-Frame-Options";
  headers[headerXFO.toLowerCase()] = [
    {
      key: headerXFO,
      value: "DENY",
    },
  ];

  const headerCTO = "X-Content-Type-Options";
  headers[headerCTO.toLowerCase()] = [
    {
      key: headerCTO,
      value: "nosniff",
    },
  ];

  return response;
};
