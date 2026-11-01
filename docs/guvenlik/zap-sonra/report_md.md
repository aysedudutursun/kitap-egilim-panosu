# ZAP Scanning Report

ZAP by [Checkmarx](https://checkmarx.com/).


## Summary of Alerts

| Risk Level | Number of Alerts |
| --- | --- |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Informational | 6 |




## Insights

| Level | Reason | Site | Description | Statistic |
| --- | --- | --- | --- | --- |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of responses with status code 2xx | 85 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of responses with status code 3xx | 7 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of responses with status code 4xx | 7 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type application/manifest+json | 3 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type font/woff2 | 11 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type image/png | 23 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type image/svg+xml | 3 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type text/css | 15 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type text/html | 11 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type text/javascript | 11 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with content type text/plain | 3 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of endpoints with method GET | 100 % |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Count of total endpoints | 26    |
| Info | Informational | https://kitap-egilim-panosu.tayse1482.workers.dev | Percentage of slow responses | 66 % |







## Alerts

| Name | Risk Level | Number of Instances |
| --- | --- | --- |
| Modern Web Application | Informational | 2 |
| Non-Storable Content | Informational | 1 |
| Re-examine Cache-control Directives | Informational | 5 |
| Storable and Cacheable Content | Informational | 2 |
| Storable but Non-Cacheable Content | Informational | Systemic |
| User Controllable HTML Element Attribute (Potential XSS) | Informational | 3 |




## Alert Detail



### [ Modern Web Application ](https://www.zaproxy.org/docs/alerts/10109/)



##### Informational (Medium)

### Description

The application appears to be a modern web application. If you need to explore it automatically then the Client Spider may well be more effective than the standard one.

* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<noscript><p class="wrap">Bu pano JavaScript gerektirir.</p></noscript>`
  * Other Info: `A noScript tag has been found, which is an indication that the application works differently with JavaScript enabled compared to when it is not.`
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/%3Fcat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/ (cat,list,q,stay,tr,ymax,ymin)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<noscript><p class="wrap">Bu pano JavaScript gerektirir.</p></noscript>`
  * Other Info: `A noScript tag has been found, which is an indication that the application works differently with JavaScript enabled compared to when it is not.`


Instances: 2

### Solution

This is an informational alert and so no changes are required.

### Reference




#### Source ID: 3

### [ Non-Storable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are not storable by caching components such as proxy servers. If the response does not contain sensitive, personal or user-specific information, it may benefit from being stored and cached, to improve performance.

* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/vaka-calismasi.html
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/vaka-calismasi.html`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `307`
  * Other Info: ``


Instances: 1

### Solution

The content may be marked as storable by ensuring that the following conditions are satisfied:
The request method must be understood by the cache and defined as being cacheable ("GET", "HEAD", and "POST" are currently defined as cacheable)
The response status code must be understood by the cache (one of the 1XX, 2XX, 3XX, 4XX, or 5XX response classes are generally understood)
The "no-store" cache directive must not appear in the request or response header fields
For caching by "shared" caches such as "proxy" caches, the "private" response directive must not appear in the response
For caching by "shared" caches such as "proxy" caches, the "Authorization" header field must not appear in the request, unless the response explicitly allows it (using one of the "must-revalidate", "public", or "s-maxage" Cache-Control response directives)
In addition to the conditions above, at least one of the following conditions must also be satisfied by the response:
It must contain an "Expires" header field
It must contain a "max-age" response directive
For "shared" caches such as "proxy" caches, it must contain a "s-maxage" response directive
It must contain a "Cache Control Extension" that allows it to be cached
It must have a status code that is defined as cacheable by default (200, 203, 204, 206, 300, 301, 404, 405, 410, 414, 501).

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3

### [ Re-examine Cache-control Directives ](https://www.zaproxy.org/docs/alerts/10015/)



##### Informational (Low)

### Description

The cache-control header has not been set properly or is missing, allowing the browser and proxies to cache content. For static assets like css, js, or image files this might be intended, however, the resources should be reviewed to ensure that no sensitive content will be cached.

* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: `public, max-age=0, must-revalidate`
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/%3Fcat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/ (cat,list,q,stay,tr,ymax,ymin)`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: `public, max-age=0, must-revalidate`
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/manifest.webmanifest
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/manifest.webmanifest`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: `public, max-age=0, must-revalidate`
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/robots.txt
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/robots.txt`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/vaka-calismasi
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/vaka-calismasi`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: `public, max-age=0, must-revalidate`
  * Other Info: ``


Instances: 5

### Solution

For secure content, ensure the cache-control HTTP header is set with "no-cache, no-store, must-revalidate". If an asset should be cached consider setting the directives "public, max-age, immutable".

### Reference


* [ https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#web-content-caching ](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#web-content-caching)
* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
* [ https://grayduck.mn/2021/09/13/cache-control-recommendations/ ](https://grayduck.mn/2021/09/13/cache-control-recommendations/)


#### CWE Id: [ 525 ](https://cwe.mitre.org/data/definitions/525.html)


#### WASC Id: 13

#### Source ID: 3

### [ Storable and Cacheable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are storable by caching components such as proxy servers, and may be retrieved directly from the cache, rather than from the origin server by the caching servers, in response to similar requests from other users. If the response data is sensitive, personal or user-specific, this may result in sensitive information being leaked. In some cases, this may even result in a user gaining complete control of the session of another user, depending on the configuration of the caching components in use in their environment. This is primarily an issue where "shared" caching servers such as "proxy" caches are configured on the local network. This configuration is typically found in corporate or educational environments, for instance.

* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/robots.txt
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/sitemap.xml
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`


Instances: 2

### Solution

Validate that the response does not contain sensitive, personal or user-specific information. If it does, consider the use of the following HTTP response headers, to limit, or prevent the content being stored and retrieved from the cache by another user:
Cache-Control: no-cache, no-store, must-revalidate, private
Pragma: no-cache
Expires: 0
This configuration directs both HTTP 1.0 and HTTP 1.1 compliant caching servers to not store the response, and to not retrieve the response (without validation) from the cache, in response to a similar request.

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3

### [ Storable but Non-Cacheable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are storable by caching components such as proxy servers, but will not be retrieved directly from the cache, without validating the request upstream, in response to similar requests from other users.

* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/css/fonts.css
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/css/fonts.css`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=0`
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/fonts/literata-latin-400-normal.woff2
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/fonts/literata-latin-400-normal.woff2`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=0`
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/icons/icon-192.png
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/icons/icon-192.png`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=0`
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/icons/icon.svg
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/icons/icon.svg`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=0`
  * Other Info: ``
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/manifest.webmanifest
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/manifest.webmanifest`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=0`
  * Other Info: ``

Instances: Systemic


### Solution



### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3

### [ User Controllable HTML Element Attribute (Potential XSS) ](https://www.zaproxy.org/docs/alerts/10031/)



##### Informational (Low)

### Description

This check looks at user-supplied input in query string parameters and POST data to identify where certain HTML attribute values might be controlled. This provides hot-spot detection for XSS (cross-site scripting) that will require further review by a security analyst to determine exploitability.

* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/%3Fcat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/ (cat,list,q,stay,tr,ymax,ymin)`
  * Method: `GET`
  * Parameter: `list`
  * Attack: ``
  * Evidence: ``
  * Other Info: `User-controlled HTML attribute values were found. Try injecting special characters to see if XSS might be possible. The page at the following URL:

https://kitap-egilim-panosu.tayse1482.workers.dev/?cat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000

appears to include user input in:
a(n) [option] tag [value] attribute

The user input found was:
list=weekly

The user-controlled value was:
weekly`
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/%3Fcat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/ (cat,list,q,stay,tr,ymax,ymin)`
  * Method: `GET`
  * Parameter: `ymax`
  * Attack: ``
  * Evidence: ``
  * Other Info: `User-controlled HTML attribute values were found. Try injecting special characters to see if XSS might be possible. The page at the following URL:

https://kitap-egilim-panosu.tayse1482.workers.dev/?cat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000

appears to include user input in:
a(n) [input] tag [min] attribute

The user input found was:
ymax=1000

The user-controlled value was:
1000`
* URL: https://kitap-egilim-panosu.tayse1482.workers.dev/%3Fcat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000
  * Node Name: `https://kitap-egilim-panosu.tayse1482.workers.dev/ (cat,list,q,stay,tr,ymax,ymin)`
  * Method: `GET`
  * Parameter: `ymin`
  * Attack: ``
  * Evidence: ``
  * Other Info: `User-controlled HTML attribute values were found. Try injecting special characters to see if XSS might be possible. The page at the following URL:

https://kitap-egilim-panosu.tayse1482.workers.dev/?cat&list=weekly&q&stay=on&tr=on&ymax=1000&ymin=1000

appears to include user input in:
a(n) [input] tag [min] attribute

The user input found was:
ymin=1000

The user-controlled value was:
1000`


Instances: 3

### Solution

Validate all input and sanitize output it before writing to any HTML attributes.

### Reference


* [ https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html ](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)


#### CWE Id: [ 20 ](https://cwe.mitre.org/data/definitions/20.html)


#### WASC Id: 20

#### Source ID: 3


