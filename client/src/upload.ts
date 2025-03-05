// import library elements
import { rxFileUpload, RxFileUpload, RxFileUploadError, RxFileUploadProgressData, RxFileUploadResponse } from '@akanass/rx-file-upload';
import { Subscription } from 'rxjs';


export function upload() {
 // create variables to store rxjs subscriptions
let progressSubscription: Subscription;
let uploadSubscription: Subscription;

// get HTML element
const inputFile: HTMLInputElement = document.querySelector(
  '#input-file',
);

// set listener to clean previous files selection
inputFile.addEventListener(
  'click',
  (e: Event) => (e.target['value'] = null),
);

// set listener to upload files
inputFile.addEventListener('change', (e: Event) => {
  // get file list
  const fileList: FileList = e.target['files'];

  // build files array
  const files: Files[] = Array.from(
    { length: fileList.length },
    (_, idx: number) => idx++,
  ).map((i: number) => fileList.item(i));

  // delete previous subscriptions to memory free
  if (uploadSubscription) {
    uploadSubscription.unsubscribe();
  }
  if (progressSubscription) {
    progressSubscription.unsubscribe();
  }

  // create new instance of RxFileUpload
  const manager: RxFileUpload = rxFileUpload({
    url: '/api/upload'
  });

  // listen on progress to update UI
  progressSubscription = manager.progress$.subscribe({
    next: (_: RxFileUploadProgressData) => {
      // log progress data in the console
      console.log(_);
      // do some UI update based on progress data 
      // updateProgressUI(_);
    },
    complete: () => console.log('PROGRESS ALL FILES COMPLETED'),
  });

  // upload file
  uploadSubscription = manager
    .upload<any>(files)
    .subscribe({
      next: (_: RxFileUploadResponse<any>) => {
        // log server answer in the console
        console.log(_);
        // do some UI update based on server data 
        // updateUI(_);
      },
      error: (e: RxFileUploadError | Error) => {
        // display error in the console
        console.error(e);
        // do some UI update based on error data 
        // updateUIWithError(e);
      },
      complete: () => console.log('UPLOAD ALL FILES COMPLETED'),
    });
});
}