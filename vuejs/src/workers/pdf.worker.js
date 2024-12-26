import * as pdfjsLib from 'pdfjs-dist'; // Correct import for non-legacy

self.onmessage = async (event) => {
  const {
    data,
    action,
    id
  } = event.data;

  if (action === 'pdfToBase64Images') {
    const base64Images = await pdfToBase64Images(data);
    self.postMessage({
      id,
      result: base64Images,
      action: 'pdfToBase64Images'
    });
  } else if (action === 'extractTextAndImages') {
    const extractedData = await extractTextAndImages(data);
    self.postMessage({
      id,
      result: extractedData,
      action: 'extractTextAndImages'
    });
  }
};

export async function pdfToBase64Images(pdfData) {
  const base64Images = [];
  try {
    const pdfDoc = await pdfjsLib.getDocument(pdfData).promise;
    const numPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const operatorList = await page.getOperatorList();

      for (const op of operatorList.fnArray) {
        if (op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintImageMaskXObject) {
          const imageName = operatorList.argsArray[operatorList.fnArray.indexOf(op)][0];
          try {
            const image = await new Promise((resolve) => {
              page.objs.get(imageName, (data) => resolve(data))
            });

            if (image) {
              const canvasImg = new OffscreenCanvas(image.width, image.height);
              const ctxImg = canvasImg.getContext('2d');
              const imgData = await image.bitmap;

              ctxImg.drawImage(imgData, 0, 0);
              base64Images.push(canvasImg.convertToBlob({
                type: 'image/png'
              }).then(blob => {
                return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    console.log('loaded Image: ', imageName)
                    resolve(reader.result)

                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }));
            } else {
              console.warn(`Image with name "${imageName}" not found in page.objs.`);
            }
          } catch (error) {
            console.error("Error extracting image:", error);
          }
        }
      }
    }

    return Promise.all(base64Images);
  } catch (error) {
    console.error("Error processing PDF:", error);
    return [];
  }
}

export async function extractTextAndImages(pdfData) {
  const extractedData = [];
  try {
    const pdfDoc = await pdfjsLib.getDocument(pdfData).promise;
    const numPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);

      // Extract text
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map(item => item.str).join(' ');
      if (textItems.trim()) {
        extractedData.push({
          type: "text",
          data: textItems
        });
      }

      // Extract images
      const operatorList = await page.getOperatorList();
      for (const op of operatorList.fnArray) {
        if (op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintImageMaskXObject) {
          const imageName = operatorList.argsArray[operatorList.fnArray.indexOf(op)][0];
          try {
            // await page.commonObjs.resolve(imageName); // Wait for the image object to be resolved
            const image = await new Promise((resolve) => {
              page.objs.get(imageName, (data) => resolve(data))
            });

            if (image) {
              const canvasImg = new OffscreenCanvas(image.width, image.height);
              const ctxImg = canvasImg.getContext('2d');
              const imgData = await image.bitmap;
              ctxImg.drawImage(imgData, 0, 0);
              const base64Image = await new Promise((resolve) => {
                canvasImg.convertToBlob({
                  type: 'image/png'
                }).then(blob => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
              });
              extractedData.push({
                type: "image",
                data: base64Image
              });
            } else {
              console.warn(`Image with name "${imageName}" not found in page.objs.`);
            }
          } catch (error) {
            console.error("Error extracting image:", error);
          }
        }
      }
    }
    return extractedData;
  } catch (error) {
    console.error("Error processing PDF:", error);
    return [];
  }
}
