/**
 * Preload file that will be executed in the renderer process.
 * Note: This needs to be attached **prior to imports**, as imports
 * would delay the attachment till after the event has been raised.
 */
document.addEventListener('DOMContentLoaded', () => {
  injectScripts(); // eslint-disable-line @typescript-eslint/no-use-before-define
  injectGetDisplayMedia()
    .then((sources) => {
      // eslint-disable-next-line no-console
      console.log(sources);
    })
    .catch((reason?: any) => {
      // eslint-disable-next-line no-console
      console.error(reason);
    });
});

import * as fs from 'fs';
import * as path from 'path';

import { desktopCapturer, ipcRenderer, DesktopCapturerSource } from 'electron';

// Do *NOT* add 3rd-party imports here in preload (except for webpack `externals` like electron).
// They will work during development, but break in the prod build :-/ .
// Electron doc isn't explicit about that, so maybe *we*'re doing something wrong.
// At any rate, that's what we have now. If you want an import here, go ahead, but
// verify that apps built with a non-devbuild nativefier (installed from tarball) work.
// Recipe to monkey around this, assuming you git-cloned nativefier in /opt/nativefier/ :
// cd /opt/nativefier/ && rm -f nativefier-43.1.0.tgz && npm run build && npm pack && mkdir -p ~/n4310/ && cd ~/n4310/ \
//    && rm -rf ./* && npm i /opt/nativefier/nativefier-43.1.0.tgz && ./node_modules/.bin/nativefier 'google.com'
// See https://github.com/nativefier/nativefier/issues/1175
// and https://www.electronjs.org/docs/api/browser-window#new-browserwindowoptions / preload

const log = console; // since we can't have `loglevel` here in preload

export const INJECT_DIR = path.join(__dirname, '..', 'inject');
// export const GET_MEDIA_DISPLAY_JS = path.resolve(
//   path.join(
//     __dirname,
//     '..',
//     'lib',
//     'static',
//     'getDisplayMedia',
//     'getDisplayMedia.js',
//   ),
// );

declare global {
  interface MediaDevices {
    getDisplayMedia(): Promise<unknown>;
  }
}

/**
 * Patches window.Notification to:
 * - set a callback on a new Notification
 * - set a callback for clicks on notifications
 * @param createCallback
 * @param clickCallback
 */
function setNotificationCallback(createCallback, clickCallback) {
  const OldNotify = window.Notification;
  const newNotify = function (title, opt) {
    createCallback(title, opt);
    const instance = new OldNotify(title, opt);
    instance.addEventListener('click', clickCallback);
    return instance;
  };
  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
    get: () => OldNotify.permission,
  });

  // @ts-ignore
  window.Notification = newNotify;
}

async function injectGetDisplayMedia(): Promise<DesktopCapturerSource[]> {
  log.log('getDisplayMedia');

  // @ts-ignore
  log.log({ desktopCapturer });
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
  });

  log.log('SOURCES', sources);
  const sourceItems = sources.map((source) => {
    const li = document.createElement('li');
    li.classList.add('desktop-capturer-selection__item');

    const liButton = document.createElement('button');
    liButton.classList.add('desktop-capturer-selection__btn');
    liButton.setAttribute('data-id', source.id);
    liButton.setAttribute('title', source.name);

    const liButtonImg = document.createElement('img');
    liButtonImg.classList.add('desktop-capturer-selection__thumbnail');
    liButtonImg.setAttribute('src', source.thumbnail.toDataURL());

    const liButtonSpan = document.createElement('span');
    liButtonSpan.classList.add('desktop-capturer-selection__name');
    liButtonSpan.innerText = source.name;

    liButton.appendChild(liButtonImg);
    liButton.appendChild(liButtonSpan);

    li.appendChild(liButton);

    return li;
  });

  const selectionElem = document.createElement('div');
  selectionElem.classList.add('desktop-capturer-selection');

  const selectionElemDiv = document.createElement('div');
  selectionElemDiv.classList.add('desktop-capturer-selection__scroller');

  const selectionElemDivUl = document.createElement('ul');
  selectionElemDivUl.classList.add('desktop-capturer-selection__list');

  sourceItems.forEach((li) => selectionElemDivUl.appendChild(li));

  selectionElemDiv.appendChild(selectionElemDivUl);

  selectionElem.appendChild(selectionElemDiv);
  selectionElemDiv.style.display = 'none';

  document.body.appendChild(selectionElem);

  // @ts-ignore we're polyfilling this non-existant method
  window.navigator.mediaDevices.getDisplayMedia = async function (): Promise<MediaStream> {
    // selectionElemDiv.style.display = 'flex';
    // return new Promise((resolve, reject) => {
    //   const buttons = Array.from(
    //     document.getElementsByClassName('desktop-capturer-selection__btn'),
    //   );
    //   buttons.forEach((button) => {
    //     button.addEventListener('click', () => {
    //       try {
    //         const userMedia = window.navigator.mediaDevices.getUserMedia({
    //           audio: {
    //             // @ts-ignore use chromium specific filters that Electron doesn't expose by default
    //             mandatory: {
    //               chromeMediaSource: 'desktop',
    //             },
    //           },
    //           video: {
    //             // @ts-ignore use chromium specific filters that Electron doesn't expose by default
    //             mandatory: {
    //               chromeMediaSource: 'desktop',
    //               chromeMediaSourceId: button.getAttribute('data-id'),
    //             },
    //           },
    //         });
    //         selectionElem.remove();
    //         resolve(userMedia);
    //       } catch (err) {
    //         reject(err);
    //       }
    //     });
    //   });
    // });
    alert('test');
    return new Promise((resolve) => resolve(null));
  };

  return sources;
}

function injectScripts() {
  const needToInject = fs.existsSync(INJECT_DIR);
  if (!needToInject) {
    return;
  }
  // Dynamically require scripts
  try {
    const jsFiles = fs
      .readdirSync(INJECT_DIR, { withFileTypes: true })
      .filter(
        (injectFile) => injectFile.isFile() && injectFile.name.endsWith('.js'),
      )
      .map((jsFileStat) => path.join('..', 'inject', jsFileStat.name));
    for (const jsFile of jsFiles) {
      log.info('Injecting JS file', jsFile);
      require(jsFile);
    }
  } catch (error) {
    log.error('Error encoutered injecting JS files', error);
  }
}

function notifyNotificationCreate(title, opt) {
  ipcRenderer.send('notification', title, opt);
}
function notifyNotificationClick() {
  ipcRenderer.send('notification-click');
}

setNotificationCallback(notifyNotificationCreate, notifyNotificationClick);

ipcRenderer.on('params', (event, message) => {
  log.info('ipcRenderer.params', { event, message });
  const appArgs = JSON.parse(message);
  log.info('nativefier.json', appArgs);
});

ipcRenderer.on('debug', (event, message) => {
  log.info('ipcRenderer.debug', { event, message });
});

export async function getSources(): Promise<DesktopCapturerSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    fetchWindowIcons: true,
  });
  return sources;
}
