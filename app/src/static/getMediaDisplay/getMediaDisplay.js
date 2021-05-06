/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const log = console;

const { desktopCapturer } = require('electron');

async function getDisplayMedia() {
  log.log('getDisplayMedia');
  return new Promise((resolve, reject) => {
    log.log('getDisplayMedia.Promise', { resolve, reject });
    try {
      // @ts-ignore
      log.log({ desktopCapturer });
      desktopCapturer
        .getSources({
          types: ['screen', 'window'],
        })
        .then((sources) => {
          log.log('SOURCES', sources);
          const sourceItems = sources.map((source) => {
            const li = document.createElement('li');
            li.classList.add('desktop-capturer-selection__item');

            const liButton = document.createElement('button');
            liButton.classList.add('desktop-capturer-selection__btn');
            liButton.setAttribute('data-id', source.id);
            liButton.setAttribute('title', source.name);
            liButton.addEventListener('click', () => {
              try {
                window.navigator.mediaDevices
                  .getUserMedia({
                    audio: {
                      // @ts-ignore use chromium specific filters that Electron doesn't expose by default
                      mandatory: {
                        chromeMediaSource: 'desktop',
                      },
                    },
                    video: {
                      // @ts-ignore use chromium specific filters that Electron doesn't expose by default
                      mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                      },
                    },
                  })
                  .then((stream) => {
                    selectionElem.remove();
                    resolve(stream);
                  })
                  .catch((reason) => {
                    log.error(
                      'getDisplayMedia().getUserMedia() Error:',
                      reason,
                    );
                    reject(reason);
                  });
              } catch (err) {
                log.error('getDisplayMedia().button.click Error:', err);
                reject(err);
              }
            });

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
          selectionElemDiv.classList.add(
            'desktop-capturer-selection__scroller',
          );

          const selectionElemDivUl = document.createElement('ul');
          selectionElemDivUl.classList.add('desktop-capturer-selection__list');

          sourceItems.forEach((li) => selectionElemDivUl.appendChild(li));

          selectionElemDiv.appendChild(selectionElemDivUl);

          selectionElem.appendChild(selectionElemDiv);
          document.body.appendChild(selectionElem);
        })
        .catch((reason) => {
          log.error('getDisplayMedia().getSources() Error', reason);
          reject(reason);
        });
    } catch (err) {
      log.error('getDisplayMedia() Error', err);
      reject(err);
    }
  });
}

window.navigator.mediaDevices.getDisplayMedia = getDisplayMedia;
