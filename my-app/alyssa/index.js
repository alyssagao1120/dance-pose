// Takes in two arrays of poses to compare
function calcPoseArrScore(poseArr1, poseArr2) {
  const WEIGHTINGS = [1, 3, 3, 1, 1, 5, 5, 5, 5, 5, 5, 1, 1, 0, 0, 0, 0]   // More important body parts are weighted more
  const WEIGHTING_SUM = 40

  // Calculates cosine similarity
  function cosSim(pair1, pair2) {
    return (pair1[0] * pair2[0] + pair1[1] * pair2[1]) / ((Math.sqrt(Math.pow(pair1[0], 2) + Math.pow(pair1[1], 2)))
      * (Math.sqrt(Math.pow(pair2[0], 2) + Math.pow(pair2[1], 2))))
  }

  // Returns array of values, each in [0, 1]
  function calcCosSimArr(pose1, pose2) {
    let res = []
    for (let i = 0; i < WEIGHTINGS.length; i++) {
      // Normalize vectors and calc cosSimilarity
      let denom1 = Math.sqrt(Math.pow(pose1.keypoints[i].position.x, 2) + Math.pow(pose1.keypoints[i].position.y, 2))
      let denom2 = Math.sqrt(Math.pow(pose2.keypoints[i].position.x, 2) + Math.pow(pose2.keypoints[i].position.y, 2))
      res[i] = cosSim([Math.pow(pose1.keypoints[i].position.x, 2) / denom1, Math.pow(pose1.keypoints[i].position.y, 2) / denom1],
        [Math.pow(pose2.keypoints[i].position.x, 2) / denom2, Math.pow(pose2.keypoints[i].position.y, 2) / denom2])
    }
    res = res.map(x => Math.min(x, 1))
    return res
  }

  // Returns value in [0, 1], where 1 is more similar
  function calcCosScore(cosSimArr) {
    let sum = 0
    for (let i = 0; i < WEIGHTINGS.length; i++) {
      sum += cosSimArr[i] * WEIGHTINGS[i]
    }
    return Math.min(sum / WEIGHTING_SUM, 1)
  }

  // Returns value in [0, 1], where 0 is more similar
  function calcEucScore(cosSimArr) {
    let sum = 0;
    for (let i = 0; i < WEIGHTINGS.length; i++) {
      sum += Math.sqrt(2 * (1 - cosSimArr[i])) * WEIGHTINGS[i]
    }
    return Math.min(sum / WEIGHTING_SUM, 1)
  }

  // Returns a value in [0, 1], where 1 is more similar
  function calcPoseScore(pose1, pose2) {
    let cosSimArr = calcCosSimArr(pose1, pose2)
    let cosScore = calcCosScore(cosSimArr)
    let euclidScore = calcEucScore(cosSimArr)

    return Math.max(0, cosScore - euclidScore)
  }

  // Takes an array of calculated poseScores
  // Returns the most and least similar poseComparisons
  function getHighlights(poseScoreArr) {
    if (poseScoreArr.length <= 1) { // choose 1 best/worst moment
      return {
        maxes: [{ score: poseScoreArr[0], ind: 0 }],
        mins: [{ score: poseScoreArr[0], ind: 0 }]
      }
    } else if (poseScoreArr.length <= 5) { // choose 1 best and 1 worst moment
      let min = { score: Number.MAX_SAFE_INTEGER, ind: -1 }
      let max = { score: Number.MIN_SAFE_INTEGER, ind: -1 }
      for (let i = 0; i < poseScoreArr.length; i++) {
        if (poseScoreArr[i] < min.score) {
          min.score = poseScoreArr[i]
          min.ind = i
        }
        if (poseScoreArr[i] > max.score) {
          max.score = poseScoreArr[i]
          max.ind = i
        }
      }

      min.score = (min.score * 100).toFixed(2)
      max.score = (max.score * 100).toFixed(2)
      return {
        maxes: [max],
        mins: [min]
      }
    } else {
      // min < min2 < min3
      let min = { score: Number.MAX_SAFE_INTEGER, ind: -1 }
      let min2 = { score: Number.MAX_SAFE_INTEGER, ind: -1 }
      let min3 = { score: Number.MAX_SAFE_INTEGER, ind: -1 }
      
      // max > max2 > max3
      let max = { score: Number.MIN_SAFE_INTEGER, ind: -1 }
      let max2 = { score: Number.MIN_SAFE_INTEGER, ind: -1 }
      let max3 = { score: Number.MIN_SAFE_INTEGER, ind: -1 }

      for (let i = 0; i < poseScoreArr.length; i++) {
        if (poseScoreArr[i] < min.score) {
          min3.score = min2.score
          min3.ind = min2.ind

          min2.score = min.score
          min2.ind = min.ind

          min.score = poseScoreArr[i]
          min.ind = i
        } else if (poseScoreArr[i] < min2.score) {
          min3.score = min2.score
          min3.ind = min2.ind

          min2.score = poseScoreArr[i]
          min2.ind = i
        } else if (poseScoreArr[i] < min3.score) {
          min3.score = poseScoreArr[i]
          min3.ind = i
        }

        if (poseScoreArr[i] > max.score) {
          max3.score = max2.score
          max3.ind = max2.ind

          max2.score = max.score
          max2.ind = max.ind

          max.score = poseScoreArr[i]
          max.ind = i
        } else if (poseScoreArr[i] > max2.score) {
          max3.score = max2.score
          max3.ind = max2.ind

          max2.score = poseScoreArr[i]
          max2.ind = i
        } else if (poseScoreArr[i] > max3.score) {
          max3.score = poseScoreArr[i]
          max3.ind = i
        }
      }

      res = {
        maxes: [max, max2, max3],
        mins: [min, min2, min3]
      }
      for (let el of res.maxes) {
        el.score = (el.score * 100).toFixed(2)
        el.ind = el.ind / 50
      }
      for (let el of res.mins) {
        el.score = (el.score * 100).toFixed(2)
        el.ind = el.ind / 50
      }
      return res
    }
  }


  let minLen = Math.min(poseArr1.length, poseArr2.length)
  let poseScoreArr = []
  let finScore = 0
  for (let i = 0; i < minLen; i++) {
    let s = calcPoseScore(poseArr1[i], poseArr2[i])
    poseScoreArr[i] = s
    finScore += s
  }
  finScore = (finScore / minLen * 100).toFixed(2)
  console.log('FINAL SCORE: ' + finScore)

  let highlights = getHighlights(poseScoreArr)

  return {
    score: finScore,
    highlights: highlights
  }
}


let video;
let poses = [];
let professionalFile;
let professionalFileURL;
let ownFile;
let ownFileURL;


function onProfessionalSubmit(event) {
    event.preventDefault();
    setup(professionalFileURL);
    localStorage.setItem('professionalVideo', professionalFileURL);
    document.getElementById("submit1").disabled = true;
    document.getElementById("image1").remove();
    let videoNode = document.querySelector('video');
    videoNode.volume = 0;
    document.getElementById("video1").style.display = "block";
    videoNode.src = professionalFileURL;
    videoNode.loop = true;
}

function onOwnSubmit(event) {
    localStorage.setItem("switch", 'true')
    event.preventDefault();
    setup(professionalFileURL);
    localStorage.setItem('ownVideo', professionalFileURL);
    document.getElementById("submit2").disabled = true;
    document.getElementById("image2").remove();
    let videoNode = document.querySelector('video');
    videoNode.volume = 0;
    document.getElementById("video2").style.display = "block";
    videoNode.src = professionalFileURL;
    videoNode.loop = true;
}

function setup(asset) {
    video = createVideo([asset], () => {
        video.loop();
        video.volume(0);
      });

  let canvas = createCanvas(width, height);
  canvas.center()
  //video.size(width, height);
  poseNet = ml5.poseNet(video, () => {
    console.log("Model is ready");
  });
  
  // Listen to new 'pose' events
  poseNet.on("pose", function (results) {
    poses = results;
  });
  video.hide();
}

function draw() {
  // console.log("in draw()")
  // image(video, 0, 0, width, height);
  drawSkeleton();
  drawKeypoints();
}

const LIMIT = 500;
let poseArr1 = []
let poseArr2 = []

function drawKeypoints() {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i].pose;
    if (localStorage.getItem("switch") === null && poseArr1.length < LIMIT) {
      localStorage.setItem("trigger", 'true');
      poseArr1.push(pose)
      console.log(pose)
      localStorage.setItem("poseArr1", JSON.stringify(poseArr1));
      console.log(JSON.parse(localStorage.getItem("poseArr1")).length)
    } else if (localStorage.getItem("switch") && poseArr2.length < LIMIT) {
      poseArr2.push(pose)
      console.log(pose)
      localStorage.setItem("poseArr2", JSON.stringify(poseArr2));
      console.log(JSON.parse(localStorage.getItem("poseArr2")).length)
    } else if (localStorage.getItem("poseArr1") != null
            && JSON.parse(localStorage.getItem("poseArr1")).length == LIMIT 
            && localStorage.getItem("poseArr2") != null
            && JSON.parse(localStorage.getItem("poseArr2")).length == LIMIT
            && localStorage.getItem("trigger") != null) {
      console.log('calculating')
      let res = calcPoseArrScore(JSON.parse(localStorage.getItem("poseArr1")),
       JSON.parse(localStorage.getItem("poseArr2")))
      console.log(res.score);
      console.log('Best pose at (' + res.highlights.maxes[0].score + '|' + res.highlights.maxes[0].ind+ ' sec), ('
      + res.highlights.maxes[1].score + '|' + res.highlights.maxes[1].ind  + ' sec), ('
      + res.highlights.maxes[2].score + '|' + res.highlights.maxes[2].ind  + ' sec)')
      console.log('Worst pose at ('  + res.highlights.mins[0].score + '|' + res.highlights.mins[0].ind  + ' sec), ('
      + res.highlights.mins[1].score + '|' + res.highlights.mins[1].ind + ' sec), ('
      + res.highlights.mins[2].score + '|' + res.highlights.mins[2].ind  + ' sec)')
      localStorage.setItem("score", res.score)
      localStorage.setItem("highlights", JSON.stringify(res.highlights))
      localStorage.removeItem("trigger")
      localStorage.removeItem("switch")
      localStorage.removeItem("poseArr1")
      localStorage.removeItem("poseArr2")
    }

    for (let j = 0; j < pose.keypoints.length; j++) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      let keypoint = pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.2) {
        fill(142, 165, 226);
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
      }
    }

    if ((localStorage.getItem("poseArr2")).length < LIMIT || (localStorage.getItem("poseArr1").length < LIMIT)) {
      document.getElementById("waitClick").style.display = "none";
    } else {
      document.getElementById("waitClick").style.display = "block";
      //document.getElementById("takeAway").style.display = "none";
    }
  }
}

// A function to draw the skeletons
function drawSkeleton() {
  createCanvas(406, 720);
  // Loop through all the skeletons detected
  // context.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < poses.length; i++) {
    let skeleton = poses[i].skeleton;
    // For every skeleton, loop through all body connections
    for (let j = 0; j < skeleton.length; j++) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      stroke(142, 165, 226);
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
    }
  }
}

(function localProfessionalVideoPlayer() {
	'use strict'
  var URL = window.URL || window.webkitURL
  let playProfessionalFile = function (event) {
    professionalFile = this.files[0]

    professionalFileURL = URL.createObjectURL(professionalFile);
  }
  var inputNode = document.querySelector('input');
  inputNode.addEventListener('change', playProfessionalFile, false);
})()

(function localOwnVideoPlayer() {
	'use strict'
  var URL = window.URL || window.webkitURL
  let playOwnFile = function (event) {
    ownFile = this.files[0];
    ownFileURL = URL.createObjectURL(ownFile);
  }
  var inputNode = document.querySelector('input');
  inputNode.addEventListener('change', playOwnFile, false);
})()
