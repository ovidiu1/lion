# Ajax

`ajax` is the global manager for handling all ajax requests.
It is a promise based system for fetching data, based on [axios](https://github.com/axios/axios)

```js script
import { html } from 'lit-html';
import { ajax } from './src/ajax.js';
import { AjaxClass } from './src/AjaxClass.js';

export default {
  title: 'Others/Ajax',
};
```

## Features

- only JS functions, no (unnecessarily expensive) web components
- supports GET, POST, PUT, DELETE, REQUEST, PATCH and HEAD methods
- can be used with or without XSRF token

## How to use

### Installation

```bash
npm i --save @lion/ajax
```

```js
import { ajax, AjaxClass } from '@lion/ajax';
```

### Example

```js
import { ajax } from '@lion/ajax';

ajax.get('data.json').then(response => console.log(response));
```

### Performing requests

Performing a `GET` request:

```js preview-story
export const performingGetRequests = () => html`
  <button
    @click=${() => {
      ajax
        .get('./packages/ajax/docs/assets/data.json')
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.log(error);
        });
    }}
  >
    Execute Request to Action Logger
  </button>
`;
```

To post data to the server, pass the data as the second argument in the `POST` request:

```js
const body = {
  ant: {
    type: 'insect',
    limbs: 6,
  },
};
ajax
  .post('zooApi/animals/addAnimal', body)
  .then(response => {
    console.log(`POST successful: ${response.status} ${response.statusText}`);
  })
  .catch(error => {
    console.log(error);
  });
```

## Configuration

### JSON prefix

The called API might add a JSON prefix to the response in order to prevent hijacking.
The prefix renders the string syntactically invalid as a script so that it cannot be hijacked.
This prefix should be stripped before parsing the string as JSON.
Pass the prefix with the `jsonPrefix` option.

```js
const myAjax = AjaxClass.getNewInstance({ jsonPrefix: ")]}'," });
myAjax
  .get('./packages/ajax/docs/assets/data.json')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.log(error);
  });
```

### Additional headers

Add additional headers to the requests with the `headers` option.

```js preview-story
export const additionalHeaders = () => html`
  <button
    @click=${() => {
      const myAjax = AjaxClass.getNewInstance({ headers: { 'MY-HEADER': 'SOME-HEADER-VALUE' } });
      myAjax
        .get('./packages/ajax/docs/assets/data.json')
        .then(response => {
          console.log(response);
        })
        .catch(error => {
          console.log(error);
        });
    }}
  >
    Execute Request to Action Logger
  </button>
`;
```

When executing the request above, check the Network tab in the Browser's dev tools and look for the Request Header on the GET call.

### Cancelable Request

It is possible to make an Ajax request cancelable, and then call `cancel()` to make the request provide a custom error once fired.

```js preview-story
export const cancelableRequests = () => html`
  <button
    @click=${() => {
      const myAjax = AjaxClass.getNewInstance({ cancelable: true });
      requestAnimationFrame(() => {
        myAjax.cancel('too slow');
      });
      myAjax
        .get('./packages/ajax/docs/assets/data.json')
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.log(error);
        });
    }}
  >
    Execute Request to Action Logger
  </button>
`;
```

### Cancel concurrent requests

You can cancel concurrent requests with the `cancelPreviousOnNewRequest` option.

```js preview-story
export const cancelConcurrentRequests = () => html`
  <button
    @click=${() => {
      const myAjax = AjaxClass.getNewInstance({ cancelPreviousOnNewRequest: true });
      myAjax
        .get('./packages/ajax/docs/assets/data.json')
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.log(error.message);
        });
      myAjax
        .get('./packages/ajax/docs/assets/data.json')
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.log(error.message);
        });
    }}
  >
    Execute Both Requests to Action Logger
  </button>
`;
```

## Considerations

Due to a [bug in axios](https://github.com/axios/axios/issues/385) options may leak in to other instances.
So please avoid setting global options in axios. Interceptors have no issues.

## Future plans

- Eventually we want to remove axios and replace it with [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- This wrapper exist to prevent this switch from causing breaking changes for our users
