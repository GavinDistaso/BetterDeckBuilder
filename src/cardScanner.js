const scannerPreview = document.getElementById('scanPreview')
const scanButton = document.getElementById('scanButton')
const canvas = document.getElementById('scanVideoReader')

const ctx = canvas.getContext('2d', { willReadFrequently: true })

async function loadCamera(){
    window.cv = await window.cv;

    navigator.mediaDevices.getUserMedia({ video: {facingMode: 'enviroment'}, audio: false }).then(stream=>{

        scannerPreview.srcObject = stream;

        scannerPreview.play();
        window.requestAnimationFrame(loop);
    })
}

document.getElementById('tmpScanButton').addEventListener('click', ()=>{
    loadCamera();
})

async function renderPreview(){
    if(!window.cv){ alert('AGHH!'); return; }

    canvas.width = scannerPreview.videoWidth;
    canvas.height = scannerPreview.videoHeight;

    ctx.drawImage(scannerPreview, 0, 0, scannerPreview.videoWidth, scannerPreview.videoHeight)

    return;

    //

    let src = cv.imread("scanVideoReader");

    //

    let boxHeight = scannerPreview.videoHeight;
    let boxWidth = 0.714 * boxHeight;

    let midX = scannerPreview.videoWidth / 2;

    let rect = new cv.Rect(midX - (boxWidth / 2), 0, boxWidth, boxHeight);

    let cropped = src.roi(rect);

    cv.imshow("scanVideoReader", cropped);

    src.delete();
    cropped.delete();

    return true;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function modulo(a, n) {
    return ((a % n) + n) % n;
}

function parallellSimularity(l1, l2){
    let [x1, y1, x2, y2, x3, y3, x4, y4] = [l1.start.x, l1.start.y, l1.stop.x, l1.stop.y, l2.start.x, l2.start.y, l2.stop.x, l2.stop.y]

    let cross = ((x2 - x1)*(y4 - y3) - (x4 - x3) * (y2 - y1)) / Math.sqrt((Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * (Math.pow(x4 - x3, 2) + Math.pow(y4 - y3, 2)))

    return Math.abs(cross);
}

async function detectCardPositions(){
    if(!window.cv){ return null; }

    let src = cv.imread('scanVideoReader');

    //

    //let width = 1500;
    let width = Math.min(src.cols, 1500);
    //let width = src.cols;
    let ratio = src.rows / src.cols;


    let resized = new cv.Mat();
    let dsize = new cv.Size(width, ratio * width); // Sets new size to 300x300
    cv.resize(src, resized, dsize, 0, 0, cv.INTER_AREA);

    //

    let gray = new cv.Mat();
    cv.cvtColor(resized, gray, cv.COLOR_RGB2GRAY);

    let blur = new cv.Mat();
    let ksize = new cv.Size(3, 3);
    //cv.bilateralFilter(gray, blur, 20, 10, 10, cv.BORDER_DEFAULT);
    cv.GaussianBlur(gray, blur , ksize, 0, 0, cv.BORDER_DEFAULT);

    let canny = new cv.Mat();
    cv.Canny(blur, canny, 50, 200, 3, false);

    let close = new cv.Mat();
    let M = cv.Mat.ones(2, 2, cv.CV_8U);
    cv.morphologyEx(canny, close, cv.MORPH_DILATE, M);

    //

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    // NOTE: RETR_EXTERNAL removes ALL child contours - may remove matches
    cv.findContours(close, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let allContours = []

    for (let i = 0; i < contours.size(); ++i) {
        let contour = contours.get(i);

        //

        let color = new cv.Scalar(0, 0,255, 255);


        let cardContour = new cv.Mat();
        cv.convexHull(contour, cardContour);

        //

        let poly = new cv.Mat();
        let peri = cv.arcLength(cardContour, true);
        cv.approxPolyDP(cardContour, poly, 0.05 * peri, true); //0.05

        let area = cv.contourArea(poly);

        let vertVectors = new cv.MatVector();
        vertVectors.push_back(cardContour)
//        cv.polylines(resized, vertVectors, true, color, 3)
        //
        if(area > 500 && poly.rows == 4){

            let verts = [];

            for(let j = 0; j < cardContour.rows; j++){
                verts.push({x: cardContour.data32S[j * 2], y: cardContour.data32S[j * 2 + 1]});
            }

            // Remove colinear verts

            for(let i = 0; i < verts.length;){
                let p1 = verts[modulo(i - 1, verts.length)];
                let p2 = verts[modulo(i, verts.length)];
                let p3 = verts[modulo(i + 1, verts.length)];

                let colinearity = parallellSimularity({start: p1, stop: p2}, {start: p2, stop: p3})

                if(colinearity < 0.1){
                    verts.splice(i, 1)
                } else{
                    i++;
                }
            }

            //

            let edges = [];

            for(let j = 0; j < verts.length; j++){
                let p1 = verts[j];
                let p2 = verts[(j + 1) % verts.length];
                edges.push({
                    start: p1,
                    stop: p2,
                    sqrLength: Math.pow(Math.abs(p1.x - p2.x), 2) + Math.pow(Math.abs(p1.y - p2.y), 2),
                    midPoint: {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2}
                })

                color = new cv.Scalar(255, 255, 0, 255);
                //cv.circle(resized, new cv.Point(p1.x, p1.y), 5, color, -1);
            }

            let longestEdges = edges.sort((a, b)=>{return Math.sign(b.sqrLength - a.sqrLength);}).slice(0, 4);



            let ySort = [...longestEdges.sort((a, b)=>{return Math.sign(b.midPoint.y - a.midPoint.y);})];
            let xSort = [...longestEdges.sort((a, b)=>{return Math.sign(b.midPoint.x - a.midPoint.x);})];

            // wind edges in the order: Highest, Right Most, Lowest, Left Most
            let edgeWinding = [
                ySort[3],
                xSort[0],
                ySort[0],
                xSort[3],
            ];

            //

            let ps1 = parallellSimularity(edgeWinding[0], edgeWinding[2])
            let ps2 = parallellSimularity(edgeWinding[1], edgeWinding[3])

            if(ps1 > 0.3 || ps2 > 0.3){
                continue;
            }

            //

            let cardVerts = [];

            for(let j = 0; j < 4; j++){
                let edge1 = edgeWinding[(j + 0) % 4];
                let edge2 = edgeWinding[(j + 1) % 4]

                let [x1, y1, x2, y2] = [edge1.start.x, edge1.start.y, edge1.stop.x, edge1.stop.y];
                let [x3, y3, x4, y4] = [edge2.start.x, edge2.start.y, edge2.stop.x, edge2.stop.y];

                let t = ((x1 - x3) * (y4 - y3) - (x4 - x3) * (y1 - y3)) / ((x4 - x3) * (y2 - y1) - (x2 - x1) * (y4 - y3));

                let x = x1 + t * (x2 - x1);
                let y = y1 + t * (y2 - y1);

                //c
                color = new cv.Scalar(255, 0, 255, 255);
                cv.circle(resized, new cv.Point(x, y), 5, color, -1);

                cardVerts.push({x: x, y: y})

                //cv.line(resized, new cv.Point(edge1.start.x, edge1.start.y), new cv.Point(edge1.stop.x, edge1.stop.y), color, 2);
                //cv.line(resized, new cv.Point(x1, y1), new cv.Point(x2, y2), color, 2);

                color = new cv.Scalar(255, 255, 255, 255);
                //cv.line(resized, new cv.Point(x3, y3), new cv.Point(x4, y4), color, 2);
            }


            allContours.push([
                cardVerts[0].x, cardVerts[0].y,
                cardVerts[1].x, cardVerts[1].y,
                cardVerts[2].x, cardVerts[2].y,
                cardVerts[3].x, cardVerts[3].y
            ]);

            color = new cv.Scalar(255, 144, 144, 255);
            cv.line(resized, new cv.Point(cardVerts[0].x, cardVerts[0].y), new cv.Point(cardVerts[1].x, cardVerts[1].y), color, 2);
            cv.line(resized, new cv.Point(cardVerts[1].x, cardVerts[1].y), new cv.Point(cardVerts[2].x, cardVerts[2].y), color, 2);
            cv.line(resized, new cv.Point(cardVerts[2].x, cardVerts[2].y), new cv.Point(cardVerts[3].x, cardVerts[3].y), color, 2);
            cv.line(resized, new cv.Point(cardVerts[3].x, cardVerts[3].y), new cv.Point(cardVerts[0].x, cardVerts[0].y), color, 2);

            //console.log(cardVerts);

            //cv.drawContours(resized, contours, i, color, 2, cv.LINE_8, hierarchy, 100);
            //
            /*

            let side1Length = Math.hypot(verts[0].x - verts[1].x, verts[0].y - verts[1].y)

            let side2Length = Math.hypot(verts[1].x - verts[2].x, verts[1].y - verts[2].y)
            let side3Length = Math.hypot(verts[2].x - verts[3].x, verts[2].y - verts[3].y)
            let side4Length = Math.hypot(verts[3].x - verts[0].x, verts[3].y - verts[0].y)

            let sideLengths = [side1Length, side2Length, side3Length, side4Length].sort()

            let rectRatio = sideLengths[0] / sideLengths[3];

            let rect = cv.minAreaRect(contour)
            let box = cv.boxPoints(rect)

            //
            */



        }
    }

    //console.log(largestContourArea, largestContourPoly)

    let color = new cv.Scalar(255,0,0, 255);


    let morphed = new cv.Mat(500, 500, resized.type);

    let dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        morphed.cols, 0,
        morphed.cols, morphed.rows,
        0, morphed.rows,
        0, 0,
    ]);

    let dataURLS = []

    var passThrough = false;

    allContours.forEach(async cardContour => {
        if(passThrough){return;}

        let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, cardContour);

        //console.log(srcTri.data32F)

        let transformMatrix = cv.getPerspectiveTransform(srcTri, dstPoints);

        cv.warpPerspective(gray, morphed, transformMatrix, morphed.size(), cv.INTER_LINEAR, cv.BORDER_CONSTANT);
        //cv.resize(morphed, morphed, new cv.Size(500, 500), 0, 0, cv.INTER_CUBIC);

        //

        cv.imshow('scanVideoReader', morphed);

        //console.log(cardContour)

        //

        let imageData = canvas.toDataURL("image/jpeg").slice(23);

        await fetch(canvas.toDataURL("image/jpeg"))

        //console.log(imageData)

        let [success, msg, payload] = await makeApiRequest('/cardreversesearch', 'POST', imageData);

        if(!success){
            console.error('An error has occured scanning a card: ' + msg)
            passThrough = true;
            return;
        }

        if(payload.distance > 10000){
            return;
        }

        let cardUUID = payload.cardUUID;

        let card = await getCardByUUID(cardUUID);

        console.log(card, payload.distance)

        let tmp = new cv.Mat();

        srcTri.convertTo(tmp, cv.CV_32SC2)

        let M = cv.moments(tmp);

        let cX = M.m10 / M.m00;
        let cY = M.m01 / M.m00;

        cv.putText(resized, card.name, new cv.Point(cX, cY), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 0, 255), 2, cv.LINE_AA)
        cv.putText(resized, "Q"+payload.distance, new cv.Point(cX, cY + 20), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 0, 255), 2, cv.LINE_AA)

        let vertVectors = new cv.MatVector();
        vertVectors.push_back(tmp)
        cv.polylines(resized, vertVectors, true, color, 3)
        
        cv.imshow('scanVideoReader', resized);
    });

    cv.imshow('scanVideoReader', resized);

    return dataURLS;
}

let allowPreview = true;

scanButton.addEventListener('click', async ()=>{
    await renderPreview();
    allowPreview = false;
    let dataBlobs = await detectCardPositions();

    setTimeout(()=>{
        allowPreview = true;
    }, 5000)
})

function loop(){
    if(!allowPreview){
        window.requestAnimationFrame(loop);
        return;
    }
    renderPreview().then(()=>{
        window.requestAnimationFrame(loop);
    })
}
