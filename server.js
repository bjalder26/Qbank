// express (MIT), fs (MIT), mathjs (open source), (Free, MIT), tinyMCE (LGPL), mathJAX (apache), tinymce-mathjax (MIT)

const express = require('express'); // express server
const http = require('http');
var fs = require('fs'); // file system
//const parser = require('./parser'); // parser for =[] calculations
//const parser = require(__dirname + '//parser.js'); // parser for =[] calculations
const nodemailer = require('nodemailer'); // required to send passwords via email
const sgMail = require('@sendgrid/mail');// required to send passwords via sendgrid

const bcrypt = require('bcrypt'); // for hashing passwords
const crypto = require('crypto'); // for generating random passwords for password recovery

const path = require("path"); 
const app = express();
const threeHours = 10800000;
const server = http.createServer(app); // not sure if this is important

const math = require('mathjs'); // for =[] calculations
const moment = require('moment'); // for dates for backup
const cron = require('node-cron'); // required for backup to be at a set time each day
const backupFolder = path.join(__dirname, 'qbanks', 'backup');

// for lti compatibility
var cfenv = require('cfenv');
var uuid = require("uuid4");
var lti = require("ims-lti");
var sessions = {};

// Define custom functions
const ln = x => Math.log(x);
const log10 = x => Math.log10(x);
const log = log10; // Use the same function name for log() as log10()

app.use(express.urlencoded({ // increases the limit on what is sent via url not sure if this is needed anymore
  limit: '50mb',
  extended: true, // not sure about
  parameterLimit: 50000
}));
app.use(express.json({limit: '50mb'})); // increases the limit on what is sent
app.post("*", require("body-parser").urlencoded({extended: true})); // attempt to make signatures work
app.enable('trust proxy');

// create product, images, user, and grades directories if they don't exist
if (!fs.existsSync(__dirname + '/products')){fs.mkdirSync(__dirname + '/products');}
if (!fs.existsSync(__dirname + '/images')){fs.mkdirSync(__dirname + '/images');}
if (!fs.existsSync(__dirname + '/qbanks')){fs.mkdirSync(__dirname + '/qbanks');}
if (!fs.existsSync(__dirname + '/grades')){fs.mkdirSync(__dirname + '/grades');}

// access to files and folders
app.use('/js', express.static(__dirname + '/js/'));
app.use('/html', express.static(__dirname + '/html/'));
app.use('/products', express.static(__dirname + '/products/'));
app.use('/quizzes', express.static(__dirname + '/quizzes/'));
app.use('/css', express.static(__dirname + '/css/'));
app.use('/images', express.static(__dirname + '/images/'));
app.use('/node_modules', express.static(__dirname + '/node_modules/'));
app.use('/users', express.static(__dirname + '/users/'));
app.use('/qbanks', express.static(__dirname + '/qbanks/'));
app.use('/grades', express.static(__dirname + '/grades/'));

// reads files
var indexFile = fs.readFileSync(__dirname + "/html/index.html", "utf8");
var pbFile = fs.readFileSync(__dirname + "/html/pb.html", "utf8");
var files = fs.readdirSync(__dirname + "/images/");
var headFile = fs.readFileSync(__dirname + "/html/head.txt", "utf8");
var users = JSON.parse(fs.readFileSync(__dirname + "/users/users.txt", "utf8"));
var lastActivity = JSON.parse(fs.readFileSync(__dirname + "/users/lastactivity.txt", "utf8"));

// calculates next file number to be used
var imageNumberArray = [];
files.forEach(function(file) {
  let numbArray = file.split('.');
  if (!isNaN(numbArray[0])) { 
  imageNumberArray.push(numbArray[0]);
  }
});
imageNumberArray.sort((a, b) => a - b);
imageNumberArray.reverse();
var nextImageNumber = imageNumberArray[0] ? parseInt(imageNumberArray[0]) + 1: 1; //increments
console.log('nextImageNumber: ' + nextImageNumber);

const port = process.env.PORT || 3000; // Use port 3000 if environment variable is not set

const listener = server.listen(port, () => {
  console.log("Your server is listening on port " + listener.address().port);
});

// Schedule the backup to run once a day at 4AM
cron.schedule('15 2 * * *', () => {
  console.log('Time for backup');
  createBackup();
});

// functions

// Function to create a backup daily

function createBackup() {
	console.log('createBackup running');
  const currentDate = moment().format('YYYY-MM-DD');
  const dayOfWeek = moment().format('dddd');
  const month = moment().format('MMMM');
  console.log(currentDate);
  console.log(dayOfWeek);
  console.log(month);
  
  const sourceFolder = path.join(__dirname, 'qbanks');
  const backupFilename = getBackupFilename(dayOfWeek, month);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder);
  }

  // Copy the files to the intermediate folder
  const intermediateFolder = path.join(backupFolder, 'intermediate');
  if (!fs.existsSync(intermediateFolder)) {
    fs.mkdirSync(intermediateFolder);
  }
  copyFiles(sourceFolder, intermediateFolder);

  // Move files from intermediate folder to the final destination
  const intermediateFiles = fs.readdirSync(intermediateFolder);
  intermediateFiles.forEach((file) => {
    const intermediatePath = path.join(intermediateFolder, file);
    const destinationPath = path.join(backupFolder, file);
    fs.renameSync(intermediatePath, destinationPath);
  });
  fs.rmdirSync(intermediateFolder);

  // Rename the backup file with the appropriate name
  const backupFilePath = path.join(backupFolder, 'backup');
  const backupDestinationPath = path.join(backupFolder, backupFilename);
  if (fs.existsSync(backupFilePath)) {
    fs.renameSync(backupFilePath, backupDestinationPath);
  }
  
  console.log('Backup created:', backupFilename);
  }

// Function to get the backup filename based on the current day and month
function getBackupFilename(dayOfWeek, month) {
  if (dayOfWeek === 'Sunday') {
    if (moment().date() === 1) {
      return `${month}.zip`;
    } else {
      return 'Week.zip';
    }
  } else {
    return `${dayOfWeek}.zip`;
  }
}

// Function to copy files from source folder to destination folder
function copyFiles(sourceFolder, destinationFolder) {
  const files = fs.readdirSync(sourceFolder);
  
  files.forEach((file) => {
    const sourcePath = path.join(sourceFolder, file);
    const destinationPath = path.join(destinationFolder, file);

    // Exclude the intermediate folder and existing backups from being copied
    if (file !== 'backup' && !fs.existsSync(destinationPath)) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  });
}

function evaluateWithCustomFunctions(equation) {
  const scope = {
    ln,
    log10,
    log,
  };
  return math.evaluate(equation, scope);
}

function equationError(equation) {
  const scope = {
    ln,
    log10,
    log,
  };
  return `<font color="red">Equation Error: ${equation}</font>`;
}

const deepCopyFunction = (inObject) => {
  let outObject, value, key;
  if (typeof inObject !== "object" || inObject === null) {
    return inObject; // Return the value if inObject is not an object
  }
  // Create an array or object to hold the values
  outObject = Array.isArray(inObject) ? [] : {};
  for (key in inObject) {
    value = inObject[key];
    // Recursively (deep) copy for nested objects, including arrays
    outObject[key] = deepCopyFunction(value);
  }
  return outObject;
};

function elapsedTime(username) {
  let lastActivity = JSON.parse(fs.readFileSync(__dirname + "/users/lastactivity.txt", "utf8"));
  lastTime = lastActivity[username] ? lastActivity[username] : 0;
  recordActivity(username);
  return Date.now() - lastTime;
}

function getSigFigs(number) {
  number = number.toString(); // unsure about this
  if (number.includes('.')) {
    number = number.replace('.', '');
    return number.length - number.search(/[123456789]/);
  } else {
    number = reverseString(number);
    return number.length - number.search(/[123456789]/);
  }
}

function isValidQuestionObject(text) {
  try {
    const parsedObject = JSON.parse(text);

    // Check if the parsed object has the required properties
    if (
      (parsedObject.group || parsedObject.group === '') &&
      (parsedObject.stem || parsedObject.stem === '') &&
      (parsedObject.solution || parsedObject.solution === '') &&
      Array.isArray(parsedObject.choices) &&
      Array.isArray(parsedObject.correct)
    ) {
      // Additional checks for other properties or conditions can be added here

      return true;
    } else {
	  //console.log(text);
      return false;
    }
  } catch (error) {
    // Catch any parsing errors and return false
	console.log("valid Question Object Error: " + error);
    return false;
  }
}

function minMaxType(variable) {
  try {
    let regex = '(?<=\\$\{)(.+?)(?=\\s)'; // matches between ${ and first space
    const letter = variable.match(regex)[0];
    const min = variable.match(/(?<=\s)(.+?)(?=\s|})/)[0]; // matches between first space and either second space or }
//console.log('min: '+min)
    const minSigFigs = getSigFigs(min);
    const max = variable.match(/(?<=\d\s)(.+?)(?=\s|})/) ? variable.match(/(?<=\d\s)(.+?)(?=\s|})/)[0] : min * 10; // matches between first space after a digit and either space or } defaults to 10 times min number
//console.log('max: '+max)
    const maxSigFigs = getSigFigs(max);
	regex = new RegExp('(?<=' + min + '\\s' + max + '\\s)(.*)(?=})', 'i'); // matches between min and max number and }
    const sigFigs = variable.match(regex) ? variable.match(regex)[0] : Math.min(parseInt(minSigFigs), parseInt(maxSigFigs)); //consider changing
//console.log('sigFigs minMaxType: '+sigFigs)
    let newNumber = Math.random() * (parseFloat(max) - parseFloat(min)) + parseFloat(min);
    newNumber = newNumber.setSigFigs(sigFigs);
    return [letter, newNumber.toString()];
  } catch (err) {
    console.error('minMaxType variable error: ' + variable + ' ; error: ' + err);
  }
}

// Function for parsing equations for html
function parseEquations(question, html) {
  //console.log('question: '+question);
  //console.log('question stem1: '+question.stem);
  let regex = new RegExp(/(?<==\[)(.*?)(?=\])/, 'g');
  const equationsSFs = html.match(regex);

  if (equationsSFs != null) {
    for (let equationSF of Object.values(equationsSFs)) {
      const equationSFArray = equationSF.split('; ');
      const equation = equationSFArray[0];
      const SF = equationSFArray[1] ? equationSFArray[1] : 3; // defaults to 3 significant figures in equations

      let solution;
      try {
        solution = evaluateWithCustomFunctions(equation.replaceAll(/ \(\d+ sf\)/g, ''));
      } catch (error) {
        //console.log(error + '\nEquation:' + equation + '\nQuestion Stem:' + question.stem);
		 html = html.replaceAll('=[' + equationSF + ']', equationError(equation));
		 return html;
      }

      let addOnSF = '';
      try {
        addOnSF = parseFloat(solution).setSigFigs(SF).match(/ \(\d+ sf\)/g) ? parseFloat(solution).setSigFigs(SF).match(/ \(\d+ sf\)/g) : '';
        if (addOnSF != null) {
          solution = parseFloat(solution).setSigFigs(SF).replace(/ \(\d+ sf\)/g, '');
        }
      } catch (err) {
        console.error('error: ' + err + ' equation: ' + equation + 'solution: ' + solution);
      }

      let solutionNum = solution.replace(/\s\(.*\)/, '') * 1;
      let exp = 0;

      if (Math.abs(solutionNum) >= 10000) {
        exp = Math.floor(Math.log10(Math.abs(solutionNum)));
        if (Math.abs(solutionNum / (10 ** exp) - 10) < 0.00001) {
          exp = exp + 1;
        }
        solutionNum = solutionNum / (10 ** exp);
        solutionNum = solutionNum.setSigFigs(SF);
        solution = solutionNum + 'x10' + '<sup>' + exp + '</sup>';
      } else if (Math.abs(solutionNum) < 0.00001 && Math.abs(solutionNum) !== 0) {
        const absSolutionNum = Math.abs(solutionNum);
        exp = Math.floor(Math.log10(absSolutionNum));
        solutionNum = solutionNum / (10 ** exp);
        if (Math.abs(solutionNum / (10 ** exp) - 10) < 0.00001) {
          exp = exp + 1;
        }
        solutionNum = solutionNum.setSigFigs(SF);
        solution = solutionNum + 'x10<sup>' + exp + '</sup>';
      } else {
        solution = (solution * 1).setSigFigs(SF);
        if (addOnSF != null) {
          //solution = solution + addOnSF; // not sure if I need this at all
        }
      }

      html = html.replaceAll('=[' + equationSF + ']', solution.toString());
    }
  } else {
    console.log('null equations');
  }
  return html;
}


function percentType(variable) {
  try {
    let regex = '(?<=\\$\{)(.+?)(?=\\s)';
    const letter = variable.match(regex)[0];
    const mid = variable.match(/(?<=\s)(.+?)(?=\s)/)[0]; //limit to numbs?
    const midSigFigs = getSigFigs(mid);
    const percent = variable.match(/(?<=\d\s)(.+?)(?=%)/) ? variable.match(/(?<=\d\s)(.+?)(?=%)/)[0] : 20;
    const sigFigs = variable.match(/(?<=%\s)(.+?)(?=\})/) ? variable.match(/(?<=%\s)(.+?)(?=\})/)[0] : midSigFigs;

    let newNumber = parseFloat(parseFloat(mid) + (parseFloat(mid) * parseFloat(percent) * 2 * (Math.random() - 0.5) / 100));
    newNumber = newNumber.setSigFigs(sigFigs);
    return [letter, newNumber.toString()];
  } catch (err) {
    console.log('percentType variable error: ' + variable + ' ; error: ' + err);
  }
}

function recordActivity(username) {
  let lastActivity = JSON.parse(fs.readFileSync(__dirname + "/users/lastactivity.txt", "utf8"));
  lastActivity[username] = Date.now();
  try {
    fs.writeFileSync(__dirname + "/users/lastactivity.txt", JSON.stringify(lastActivity), {
      flag: 'w+'
    });
    console.log("File written successfully (recordActivity)");
  } catch (err) {
    console.error(err);
  }
}

function removeMJX(html) {
  html = html.replaceAll(/<div class="MJX.*/gs, '');
  return html;
}

// replaces the image data with a link
function replaceImageSrc(data, numberOfImages) { // improve names
  for (let i = 0; i < numberOfImages; i++) {
    let imageTypeArray = [];
    imageTypeArray = data.match(/(?<=src="data:image\/)(.*?)(?=;)/);
    let imageType = imageTypeArray[0];
    data.match(/(?<=src="data:image\/)(.*?)(?=;)/);
    const fileName = (nextImageNumber) + '.' + imageType;
	nextImageNumber = nextImageNumber + 1; // increments nextImageNumber after use
    let dataArray = data.split('base64,');
    let imgdata = dataArray[1];
    let imgdataArray = imgdata.split('"');
    let buff = Buffer.from(imgdataArray[0], 'base64');
    data = data.replace(/(?<=src=")data(.*?)(?=")/m, '../images/' + fileName);
    fs.writeFile(__dirname + '/images/' + fileName, buff, function(err) {
      if (err) {
        return console.error('replaceImageSrc: ' + err);
      }
      console.log("The file was saved!");
    });
  }
  return data;
}

function replaceVariables(string) {
  //makes array of all ${} matches
  let varArray = string.match(/\${(.*?)}/g); // double check if this needs let
  if (varArray) {
    // declaires variables
    let result = '';
    let arrayArray = [];
    let shortest = 99; // hard limit of 99 being highest number of choices in variable

    // iterates through each varable in array
    for (let variable of varArray) {

      // gets results for % and min/max type, and creates array
      if (variable.includes('%')) {
        result = percentType(variable);
      } else {
        if (variable.includes(',')) {
          arrayArray.push(variable);
        } else {
          if (variable.length > 4) {
            result = minMaxType(variable);
          }
        }
      }
      const replace = result[0];
      var regex = new RegExp(`\\$\{${replace}\}|\\$\{${replace}\\s(.*?)\}`, 'g');
      string = string.replaceAll(regex, result[1]);
    } // end variable itteration

    // array code
    // get shortet length and set rand choice
    try {
      for (let array of arrayArray) {
        shortest = varToArray(array).length < shortest ? varToArray(array).length : shortest;
      }
      const rand = Math.floor(Math.random() * shortest);
      // make new obj from arrayArray
      const arrayObj = {};
      for (let array of arrayArray) {
        arrayObj[array] = toArray(array.replaceAll('$', '').replaceAll('{', '').replaceAll('}', ''))[rand];
      }
      // replace each array
      for (let array of Object.keys(arrayObj)) {
        string = string.replaceAll(array, arrayObj[array].trim());
      }
    } catch (err) {
      console.error('arrayType variable error: ' + variable + ' ; error: ' + err);
    }
    // end array code
  }
  return string;
}

function reverseString(string) {
  stringArray = string.split('');
  reverseArray = stringArray.reverse();
  return reverseArray.join("");
}

Number.prototype.setSigFigs = function(sf) {
 //console.log('this setSigFigs: '+this);
 //console.log('------------------------------------------');
  sf = sf*1;
  let n = Number(this.toPrecision(sf)).toString(); // rounded here, but not sig figs
  //console.log('n1: '+n)
  let exp = 0;
  if (n.includes('e')) { // splits exponents from coefficient
    const numpartsarray = n.split('e');
    n = numpartsarray[0];
    //console.log('n2: '+n);
	if (!n.includes('.')) {
		if(n.length < sf) {
			n = n+'.';
		}		
	}
	n = n.padEnd(sf+1, 0)
    //console.log('n3: '+n);
    exp = numpartsarray[1];
  }
  let neg = false;
  if (parseInt(n) < 0) { // removes negative, and remembers it was negative
    n = n.replace('-', '');
    neg = true;
  }
  if (n >= 1) { // if > 1
    if (n.length < sf || n.length == sf && n[n.length - 1] == 0) {
      n = n + '.';
    }
    let end = sf - n.length;
    if (n.includes('.')) {
      end = end + 1;
    }
    for (let i = 0; i < end; i++) {
      n = n + '0';
    }
    let checkIfAllZeros = n.slice(sf-1)
    if (+checkIfAllZeros == 0 && !n.includes('.')) {
      n = n + ` (${sf} sf)`;
    }
  } else if (n != 0) { // if < 1
  //console.log('n4: '+n)
  //console.log('sf1: '+sf)
  let zeros = n.match(/(?<=\.)(0*)/g);
  //console.log('zeros: '+zeros);
  let zerosLength = zeros ? zeros[0].length : 0;
  //console.log('zl/sf: ' + zerosLength + ' ' + sf);
  n = n.padEnd(zerosLength+sf+2, 0);
  } else {
	  n = n + '.'; 
	  zerosLength = 0;
  n = n.padEnd(zerosLength+sf+1, 0);
  //n = n.padEnd(sf+2, 0);
  //console.log('n5: '+n)
  }
  if (neg) {
    n = '-' + n;
  }
  if (exp != 0) {
    n = (parseFloat(n) * 10 ** parseInt(exp)).toPrecision(sf).toString();
  }
  //console.log('n6: '+n)
  if (n == '0.') {
	  n = '0';
  }
  return n;
};

/*
Number.prototype.setSigFigs = function(sf) {
  let n = Number(this.toPrecision(sf)).toString();
  let exp = 0;
  if(n.includes('e')) {
	  const numpartsarray = n.split('e');
	  n = numpartsarray[0];
	  exp = numpartsarray[1];
  }
  let neg = false;
  if (parseInt(n) < 0) {
    n = n.replace('-', '');
    neg = true;
  }
  if (n >= 1) {
    if (n.length < sf || n.length == sf && n[n.length - 1] == 0) {
      n = n + '.';
    }
    let end = sf - n.length;
    if (n.includes('.')) {
      end = end + 1;
    }
    for (let i = 0; i < end; i++) {
      n = n + '0';
    }
    if (n[n.length - 1] == '0' && n[n.length - 2] == '0' && !n.includes('.')) {
      n = n + ` (${sf} sf)`;
    } else {
      let count = 0;
      for (let digit of n) {
        count = count + 1;
        if (digit != '0' && digit != '.') {
          break;
        }
      }
      const end = n.length - count - sf;
      for (let i = 0; i < end; i++) {
        n = n + '0';
      }
    }
  }
  if (neg) {
    n = '-' + n;
  }
  if(exp != 0) {
	  n = (parseFloat(n)*10**parseInt(exp)).toString();
  }
  return n;
}; */

function shuffleArray(array) { //  Fisher-Yates shuffle
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// splices in new questions, or deletes questions
function spliceQuestion(obj, newQuestion, qbanks, del) {
  let qbank = qbanks[obj.subject][obj.course][obj.question_bank];
  if (del) {
    qbank.splice(obj.question_number - 1, 1);
  } else {
    qbank.splice(obj.question_number, 0, newQuestion);
  }
  qbanks[obj.subject][obj.course][obj.question_bank] = qbank;
  return qbanks;
}

function toArray(item) {
  if (Array.isArray(item)) {
    return item;
  } else {
    return item.split(',');
  }
}
// ==================

function generateHeadHTML(title, instructor, date) { // Creates the HTML head section based on the provided title, instructor, and date.
  let html = headFile.replace('${title}', `<h1>${title}</h1>`);
  if (typeof instructor !== 'undefined') {
    html = html.replace('${instructor}', `<h4>${instructor}</h4>`);
  } else {
    html = html.replace('${instructor}', '');
  }
  if (typeof date !== 'undefined') {
    html = html.replace('${date}', `<h6>${date}</h6>`);
  } else {
    html = html.replace('${date}', '');
  }
  return html;
}

function readQbanksFile(userName) {
  const qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  return JSON.parse(qbanksFile);
}

function copyQbank(qbanks, subject, course, qbankName) {
  const shallowQbank = qbanks[subject][course][qbankName];
  return deepCopyFunction(shallowQbank);
}

function removeRandomQuestions(qbank) {
  let groupObj = {};
  let indexesToDelete = [];

  for (let i = 0; i < qbank.length; i++) {
    const groupName = qbank[i]['group'];

    if (typeof groupName !== 'undefined' && groupName.trim() !== '') {
      if (groupName.toLowerCase() === 'x') {
        indexesToDelete.push(i);
      } else {
        if (typeof groupObj[groupName] === 'undefined') {
          groupObj[groupName] = [];
        }
        groupObj[groupName].push(i);
      }
    }
  }

  for (let group of Object.keys(groupObj)) {
    const keep = Math.floor(Math.random() * groupObj[group].length);
    groupObj[group].splice(keep, 1);
    indexesToDelete.push(...groupObj[group]);  // Use push() to add individual indexes
  }

  indexesToDelete.sort((a, b) => b - a);  // Sort the indexes in descending order

  for (let index of indexesToDelete) {
    qbank.splice(index, 1);
  }
}

function generateQuestionHTML(questionNumber, question) { //Generates the HTML markup for a single question using the provided question data.
  let html = `<div class='question'><button class="x" onclick="deleteQuestion(this.parentElement);">x</button><div class='stem'><span class="questionNumber">${questionNumber}</span>) ${question.stem}</div>`;
  //todo: evaluate equations here
  
  // Generate the HTML for the question's choices and other elements
  // ...
  //html += `<p></p></div>`;
  //html = fixMathJaxAdjustments(html);
  //html = replaceVariables(html);
  return html;
}

// stop here ***

function pushChoicesToAnswerArray(choicesArray) {
	//console.log('choicesArrayPCTAA: '+choicesArray);
	//console.log('isArray :'+Array.isArray(choicesArray));
  let answerArray = [];
  for (let choice of choicesArray) {
	//console.log('choice: '+choice);
    let choiceText = choice[0];
	//console.log('choiceText: '+choiceText);
    let isCorrect = choice[1];
	//console.log('isCorrect: ');
	//console.log(isCorrect);
    if (choiceText.trim() !== '') { // Skip empty choices
      let asterisk = isCorrect ? `<span class='asterisk'>*</span>` : '';
	  answerArray.push(`${choiceText}${asterisk}</div>`);
    }
  }
  return answerArray;
}


function fixMathJaxAdjustments(html) {
  const updatedHtml = html
    .replaceAll('\\%', '%')
    .replaceAll('\\{', '{')
    .replaceAll('\\}', '}')
    .replaceAll('\\ ', ' ');

  return updatedHtml;
}

//====================
	
function qbankToHtml(subject, course, qbankAndNumArray, userName, title, instructor, date) {
  let questionNumber = 1;
  let html = generateHeadHTML(title, instructor, date); // generates head portion of HTML by replacing title, instructor, date

  let qbanks = readQbanksFile(userName); // reads qbanks file and puts in qbanks variable
 let questionsObject = {};
 
  for(let qbankAndNum of qbankAndNumArray) {
  let qNum = 1;
  let qbank = copyQbank(qbanks, subject, course, qbankAndNum.qbankName);// makes deep copy so qbanks won't be changed 
  
  removeRandomQuestions(qbank); // randomly removes all but 1 question from each group
 
  let shuffledQbank = shuffleArray(qbank);
  
  let answerArray = [];
  for (let question of shuffledQbank) { 
    if(qNum <= qbankAndNum.number) { // limits the number of questions from each qbank to number choosen by user
	qNum++;
			
	html += generateQuestionHTML(questionNumber, question);  // currently only generates the beginning
	questionNumber++;
	
    let choices = question.choices;

	let correctChoices = question.correct

	let choicesArray = choices.map((choice, index) => [choice, correctChoices.includes(index.toString())]);

  let shuffledChoicesArray = {};
  if(!question.rqo) {
	  shuffledChoicesArray = shuffleArray(choicesArray);
  } else {
	  shuffledChoicesArray = choicesArray;
  }
  
let filteredChoicesArray = shuffledChoicesArray.filter(([choiceText]) => choiceText.trim() !== '');

let trueIndexes = filteredChoicesArray.reduce((indexes, choice, index) => {
	    //console.log('choice:', choice);
  //console.log('isCorrect:', choice[1]);
  if (choice[1]) {
    indexes.push(index);
  }
  return indexes;
}, []);

  questionsObject[questionNumber-1] = trueIndexes;

let choicesHTML = pushChoicesToAnswerArray(shuffledChoicesArray);
	
	let shuffledAnswerArray = choicesHTML;
    
    let answerNumber = 0;
    let optionLetter = '';
    for (let answer of shuffledAnswerArray) {
      optionLetter = String.fromCharCode(answerNumber + 65);
      shuffledAnswerArray[answerNumber] = `<div class='option'>${optionLetter}) ` + answer;
      answerNumber = answerNumber + 1;
    }

    for (let each of shuffledAnswerArray) { // adds answer choices to html
      html = html + each; // todo: evaluate formulas here and check for duplicate answers
    }

    // all of the above  
    if (typeof question.aota !== 'undefined') {
      optionLetter = String.fromCharCode(answerNumber + 65);
      answerNumber = answerNumber + 1;
      html = html + `<div class='option'>${optionLetter})  All of the above.`;
      if (question.aota) {
        html = html + `<span class='asterisk'>*</span>`;
      }
      html = html + `</div>`;
    }
    // none of the above
    if (typeof question.nota !== 'undefined') {
      optionLetter = String.fromCharCode(answerNumber + 65);
      html = html + `<div class='option'>${optionLetter})  None of the above.`;
      if (question.nota) {
        html = html + `<span class='asterisk'>*</span>`;
      }
      html = html + `</div>`;
    }
	
	let solution = question.solution ? question.solution : "";
	if (solution != '') {
		html = html + `<div class='solution'>${solution}</div>`
	}

    html = html + `<p></p></div>`;
    
    // fix adjustments made for MathJax
	fixMathJaxAdjustments(html);
	  	  
    // replace variables with numbers
    try {
      html = replaceVariables(html);
    } catch (err) {
      console.error('replacevar: ' + err + '\nquestion: ' + question.stem);
    }
	// Parse equations for this question
	html = parseEquations(question, html);
  } else {break;}
  }
  
  } // end here 
  
  // add scantron
  html = html + `<div id="scantrondiv" class="scantrondiv">${title}<br><canvas id="scantron" class="scantron">`
  
  
  html = html + '</div></body></html>';
  //console.log(html);
   const questionsObjectText = JSON.stringify(questionsObject);
  html = html.replace("//PARAMS**GO**HERE",
      `
					questionsObject = ${questionsObjectText}; 
				`);
  //console.log(html); 
  
  /* I don't think this is needed - I think it is a throwback from testing.
  const reg = new RegExp('(?<!\.\.\/)(images)', 'g');
  console.log('regex match:');
  console.log(html.match(reg));
  try {
    html = html.replaceAll(reg, '..\/images');
  } catch (err) {
    console.error('error: ' + err + '\nquestion: ' + question.stem);
  }
  */
  
  // other functions
  // charges - this takes a calculated charge and ensures that a + or - is after it.
  
  regex = new RegExp(/(?<=charge\[)(.*?)(?=\])/, 'g');
  const charges = html.match(regex);

  if (charges != null) {
	  for (let charge of Object.values(charges)) {
      const sign = charge.includes('-') ? '-' : charge == '0' ? '' : '+';
	  const num = Math.abs(charge);
	  html = html.replaceAll('charge[' + charge + ']', num+sign)
	  }
  }
  
  return (html);
}

function varToArray(varable) {
  return toArray(varable.replaceAll('$', '').replaceAll('{', '').replaceAll('}', ''));
}

// posts
app.post("/", (req, res) => {
  const data = req.body.objFromFileLoaded;
  const subjectName = req.body.subjectName;
  const courseName = req.body.courseName;
  const qbankName = req.body.qbankName;
  const userName = req.body.userName;
  
  var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  var qbanks = JSON.parse(qbanksFile);

  if(typeof qbankName != 'undefined') {
	if(typeof qbanks[subjectName][courseName][qbankName] == 'undefined') {
	  qbanks[subjectName][courseName][qbankName] = data;	  
	} else {console.error(`Question bank ${qbankName} already exists`)}
  } else if(typeof courseName != 'undefined') {
	if(typeof qbanks[subjectName][courseName] == 'undefined') {
	  qbanks[subjectName][courseName] = data;	  
	} else {console.error(`Course ${courseName} already exists`)}
  } else if(typeof subjectName != 'undefined') {
	if(typeof qbanks[subjectName] == 'undefined') {
	  qbanks[subjectName] = data;	  
	} else {console.error(`Subject ${subjectName} already exists`)}
  } else {console.error(`Subject undefined`)}

  try {
    fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
      flag: 'w+'
    });
    console.log("File written successfully (import)");
  } catch (err) {
    console.error('qbank write: ' + err);
  }
  
  let passed = {};
  passed.userName = userName;
  passed = encodeURI(JSON.stringify(passed));
  res.redirect(`/edit/${passed}`); // doesn't really control destination, but apparently a response is needed
});

app.post("/merge", (req, res) => {
  const data = req.body.objFromFileLoaded;
  const subjectName = req.body.subjectName;
  const courseName = req.body.courseName;
  const qbankName = req.body.qbankName;
  const userName = req.body.userName;
  const buttonPressed = req.body.buttonPressed;
  //console.log(data, subjectName, courseName, userName, buttonPressed);
  var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  var qbanks = JSON.parse(qbanksFile);

 if (buttonPressed == 'mergeQbank') {
   if (typeof qbankName != 'undefined') {
     if (typeof qbanks[subjectName][courseName][qbankName] == 'undefined') {
       qbanks[subjectName][courseName][qbankName] = data;
     } else {
        const qbank = qbanks[subjectName][courseName][qbankName].concat(data);
		qbanks[subjectName][courseName][qbankName] = qbank;
     }
   }
 } else if (buttonPressed == 'mergeCourse') {
   if (typeof courseName != 'undefined') {
     if (typeof qbanks[subjectName][courseName] == 'undefined') {
		 //console.log('3');
       qbanks[subjectName][courseName] = data;
     } else {
       const obj = Object.assign(qbanks[subjectName][courseName], data); // should probably adjust so it deals with duplicate subj
     }
   }

 } else if (buttonPressed == 'mergeSubject') {
   if (typeof subjectName != 'undefined') {
     if (typeof qbanks[subjectName] == 'undefined') {
       qbanks[subjectName] = data;
     } else {
       const obj = Object.assign(qbanks[subjectName], data); // should probably adjust so it deals with duplicate qbanks
     }
   }
 } else {
   console.error(`Merge error - button press not known`)
 }

  try {
    fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
      flag: 'w+'
    });
    console.log("File written successfully (merge)");
  } catch (err) {
    console.error('qbank write: ' + err);
  }
  
  let passed = {};
  passed.userName = userName;
  passed = encodeURI(JSON.stringify(passed));
  res.redirect(`/edit/${passed}`); // doesn't really control destination, but apparently a response is needed
});

app.post('/login', async (req, res) => {
  let foundUser = users.find((data) => req.body.email === data.email);
  if (foundUser) {
    let submittedPass = req.body.password;
    let storedPass = foundUser.password; // gets password 

    const passwordMatch = await bcrypt.compare(submittedPass, storedPass); //compares passwords
    if (passwordMatch) {
      userName = foundUser.username; // sets userName variable

      recordActivity(userName);
      let passed = {};
      passed.userName = foundUser.username;
      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    } else {
      res.send("<div align ='center'><h2>Invalid email or password</h2></div><br><br><div align ='center'><a href='./login'>Login again</a></div>");
    }
  } else {

    let fakePass = `$2b$$10$ifgfgfgfgfgfgfggfgfgfggggfgfgfga`;
    await bcrypt.compare(req.body.password, fakePass);

    res.send("<div align ='center'><h2>Invalid email or password</h2></div><br><br><div align='center'><a href='./login'>Login again<a><div>");
  }
});

app.post('/newpassword', async (req, res) => {
  let foundUser = users.find((data) => req.body.email === data.email);
  if (foundUser) {
	const targetIndex = users.indexOf(foundUser);
    let submittedPass = req.body.password;
    let storedPass = foundUser.password; // gets password 
	let newPass = req.body.newpassword;
    const passwordMatch = await bcrypt.compare(submittedPass, storedPass); //compares passwords
    if (passwordMatch) {
		try {
      userName = foundUser.username; // sets userName variable
    let hashPassword = await bcrypt.hash(newPass, 10);
    let oldUser = {
      id: foundUser.id,
      username: foundUser.username,
      email: req.body.email,
      password: hashPassword,
    };
    users[targetIndex] = oldUser;
		} catch (err) {
      console.error(err);
    }
	
	try {
      fs.writeFileSync(__dirname + "/users/users.txt", JSON.stringify(users), {
        flag: 'w+'
      });
      console.log("File written successfully (newpassword)");
    } catch (err) {
      console.error(err);
    }
	  
	  res.send("<div align ='center'><h2>Your password has been updated.</h2></div><br><br><div align ='center'><a href='./login'>Login</a></div>");
	  
    } else {
      res.send("<div align ='center'><h2>Invalid email or password</h2></div><br><br><div align ='center'><a href='./newpassword'>Try again</a></div>");
    }
  } else {
    res.send("<div align ='center'><h2>Invalid email or password</h2></div><br><br><div align='center'><a href='./newpassword'>Try again<a><div>");
  }
});

app.post('/password', async (req, res) => {
  try {
    let foundUser = users.find((data) => req.body.email === data.email);
    console.log(foundUser);
    if (foundUser) {
	  const targetIndex = users.indexOf(foundUser);		
      let storedPass = foundUser.password; // gets password 
      //console.log(storedPass);
      
      const apiKey = fs.readFileSync(__dirname + "/users/api.txt", "utf8");
      //console.log(apiKey);
      sgMail.setApiKey(apiKey);
	  
	  // generate temporary password
	  const generateTemporaryPassword = () => {
		const length = 10;
		return crypto.randomBytes(length).toString('hex');
	  };
	  const temporaryPassword = generateTemporaryPassword();
      // Set up the email message
	  console.log(req.body.email);
      const msg = {
        from: 'bradyalder@gmail.com',
        to: req.body.email,
        subject: 'Qbank Password',
        text: 'This is your temporary qbank password: ' + temporaryPassword + '\nUse your email address and password to log in at http://qbank.tk/newpassword.html to set up a new password using your tempoary password.'
      };
	  console.log(msg);
  
	  try {
      await sgMail.send(msg);
	  } catch (err) {
      console.error(err);
		}
	  let hashPassword = await bcrypt.hash(temporaryPassword, 10);
      let oldUser = {
        id: foundUser.id,
        username: foundUser.username,  
        email: req.body.email,
        password: hashPassword,
      };
      users[targetIndex] = oldUser;
		
      console.log('Email sent');
      res.send("<div align ='center'><h2>Check your email for your temporary password.  Then follow the link below to set up a new password.</h2></div><br><br><div align ='center'><a href='./newpassword'>Set up new password</a></div>");
    }
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/register', async (req, res) => {
  let foundUser = users.find((data) => req.body.email === data.email);

  if (!foundUser) {
    let hashPassword = await bcrypt.hash(req.body.password, 10);
    let newUser = {
      id: Date.now(),
      username: req.body.username,
      email: req.body.email,
      password: hashPassword,
    };
    users.push(newUser);

    try {
      fs.writeFileSync(__dirname + "/users/users.txt", JSON.stringify(users), {
        flag: 'w+'
      });
      console.log("File written successfully (register user)");
    } catch (err) {
      console.error(err);
    }

    try {
      fs.writeFileSync(__dirname + "/qbanks/" + req.body.username + "_qbanks.txt", '{}', {
        flag: 'w+'
      });
      console.log("File written successfully (register qbanks)");
    } catch (err) {
      console.error(err);
    }

    res.send("<div align ='center'><h2>Registration successful</h2></div><br><br><div align='center'><a href='./login'>Login</a></div><br><br><div align='center'><a href='./register'>Register another user</a></div>");
  } else {
    res.send("<div align ='center'><h2>Email already used</h2></div><br><br><div align='center'><a href='./register'>Register again</a></div>");
  }
});

app.post("/reorder", (req, res) => {
  const subjectName = req.body.subjectName;
  const courseName = req.body.courseName;
  const qbankName = req.body.qbankName;
  const qbankData = req.body.qbankData;
  const userName = req.body.userName;
  //console.log('userName: '+userName);
  
  var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  var qbanks = JSON.parse(qbanksFile);
  
  if(typeof subjectName != 'undefined' && typeof courseName != 'undefined' && typeof qbankName != 'undefined'  && qbankData != null) {
  qbanks[subjectName][courseName][qbankName] = qbankData;
  }

  try {
    fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
      flag: 'w+'
    });
    console.log("File written successfully (reorder)");
  } catch (err) {
    console.error('qbank write: ' + err);
  }
  
  let passed = {};
  passed.userName = userName;
  passed = encodeURI(JSON.stringify(passed));
  res.redirect(`/edit/${passed}`); // doesn't really control destination, but apparently a response is needed
});

// when form data needed, save, add, duplicate, delete
app.post("/submit", (req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  let userName = obj.userName;

  var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  var qbanks = JSON.parse(qbanksFile);

  if (typeof obj.deleteQuestion === 'undefined') {
    if (typeof obj.addBlank === 'undefined') {
      if (obj.pasteFromLocalStorage) {
		  const localStorageText = obj.localStorageText
        if (localStorageText && isValidQuestionObject(localStorageText)) {
          const parsedQuestion = JSON.parse(localStorageText);
          qbanks = spliceQuestion(obj, parsedQuestion, qbanks);
        } else {
          // Handle case when localstorage does not contain a valid question object
          console.log("Invalid local storage content or no content available.");
        }
      } else {
        // Duplicating question
        let newQuestion = {};
        newQuestion.group = obj.group;

        let numberOfImages = obj.question_stem.match('src="data:') ? obj.question_stem.match(/src="data:/g).length : 0;
        newQuestion.stem = replaceImageSrc(removeMJX(obj.question_stem), numberOfImages);

        let choiceArray = [];
        let correctArray = [];

        for (let i = 0; i < 21; i++) { // hard limit of 20 input choices
          if (obj['choice_' + String.fromCharCode(parseInt(i) + 65)] !== undefined) {
            let choice = obj['choice_' + String.fromCharCode(parseInt(i) + 65)];
            numberOfImages = choice.match('src="data:') ? choice.match(/src="data:/g).length : 0;
            choice = replaceImageSrc(removeMJX(choice), numberOfImages);
            choiceArray.push(choice);

            if (obj['checkbox_' + String.fromCharCode(parseInt(i) + 65)]) {
              correctArray.push(obj['checkbox_' + String.fromCharCode(parseInt(i) + 65)]);
            }
          } else {
            break;
          }
        }
        newQuestion.choices = choiceArray;

        newQuestion.correct = correctArray;

        newQuestion.solution = obj.solution;

        const aotacb = obj.all_of_the_above_cb;
        const notacb = obj.none_of_the_above_cb;

        if (obj.all_of_the_above) {
          newQuestion.aota = aotacb == 'on';
        }
        if (obj.none_of_the_above) {
          newQuestion.nota = notacb == 'on';
        }
        if (obj.retain_question_order) {
          newQuestion.rqo = obj.retain_question_order == 'on';
        }
        if (obj.duplicateQuestion) {
          qbanks = spliceQuestion(obj, newQuestion, qbanks);
        } else {
          qbanks[obj.subject][obj.course][obj.question_bank][obj.question_number - 1] = newQuestion;
        }
      }
    } else {
      // Blank question
      let newQuestion = {
        stem: "",
        choices: [""],
        correct: [],
        group: ''
      };
      qbanks = spliceQuestion(obj, newQuestion, qbanks);
    }
  } else {
    // Delete question
    qbanks = spliceQuestion(obj, null, qbanks, true);
  }

  try {
    fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
      flag: 'w+'
    });
    console.log("File written successfully (submit)");
  } catch (err) {
    console.error('qbank write: ' + err);
  }

  let passed = {};
  passed.userName = userName; // may need to add more
  passed = encodeURI(JSON.stringify(passed));
  res.redirect(`/edit/${passed}`);
});

// gets
app.get("/", (req, res) => {
  res.redirect('/login');
});

app.get("/deleteCourse/:passed", (req, res) => {
  if (req.params.passed) { // remember to encode first
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject][course] !== 'undefined') { //check if name already used
      delete qbanks[subject][course];
      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (deleteCourse)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

app.get("/deleteQbank/:passed", (req, res) => {
  if (req.params.passed) { // remember to encode first
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const qbank = passed.qbank.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject][course][qbank] !== 'undefined') { //check if name already used
      delete qbanks[subject][course][qbank];
      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (deleteQbank)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

app.get("/deleteSubject/:passed", (req, res) => {
  if (req.params.passed) { // remember to encode first
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject] !== 'undefined') { //check if name already used
      delete qbanks[subject];
      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (deleteSubject)");
      } catch (err) {
        console.error(err);
      }

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

app.get("/edit/:passed", (req, res) => {
  let passed = decodeURI(req.params.passed);
  passed = JSON.parse(passed);
  const userName = passed.userName;
  var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  var qbanks = JSON.parse(qbanksFile);
  //var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {}; // probably not needed
	
  if (typeof passed.userName === 'undefined' || passed.userName == '' || elapsedTime(passed.userName) > threeHours) { // must give condition
    res.redirect('/login');
  } else {

    qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    qbanks = JSON.parse(qbanksFile);

    var sendMe = indexFile.toString().replace("//PARAMS**GO**HERE",
      `
					var qbanks = ${qbanksFile};
					var user = '${passed.userName}'; 
				`);

    res.send(sendMe);
  }
});

app.get("/pb/:passed", (req, res) => {
  let passed = decodeURI(req.params.passed);
  passed = JSON.parse(passed);
  const userName = passed.userName;
  var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  var qbanks = JSON.parse(qbanksFile);
	
  if (typeof passed.userName === 'undefined' || passed.userName == '' || elapsedTime(passed.userName) > threeHours) { // must give condition
    res.redirect('/login');
  } else {

    qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    qbanks = JSON.parse(qbanksFile);

    var sendMe = pbFile.toString().replace("//PARAMS**GO**HERE",
      `
					var qbanks = ${qbanksFile};
					var user = '${passed.userName}';
					var subject = '${passed.subject}';
					var course = '${passed.course}';
				`);

    res.send(sendMe);
  }
});

app.get("/login", (req, res) => {
  var loginFile = fs.readFileSync(__dirname + "/html/login.html", "utf8");
  res.send(loginFile.toString());
});

app.get("/logout/:passed", (req, res) => {
	let passed = decodeURI(req.params.passed);
  passed = JSON.parse(passed);
	let lastActivity = JSON.parse(fs.readFileSync(__dirname + "/users/lastactivity.txt", "utf8"));
  lastActivity[passed.userName] = 0;
  try {
    fs.writeFileSync(__dirname + "/users/lastactivity.txt", JSON.stringify(lastActivity), {
      flag: 'w+'
    });
    console.log("File written successfully (login)");
  } catch (err) {
    console.error(err);
  }
	res.redirect('/login');
});

app.get("/newCourse/:passed", (req, res) => {
  if (req.params.passed) {
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const qbank = passed.qbank.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject][course] === 'undefined') { //check if name already used
      qbanks[subject][course] = JSON.parse(`{"${qbank}": [{"group": "","stem": "","choices": [],"correct": []}]}`);

      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (newCourse)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

app.get("/newpassword", (req, res) => {
  var loginFile = fs.readFileSync(__dirname + "/html/newpassword.html", "utf8");
  res.send(loginFile.toString());
});

app.get("/newQbank/:passed", (req, res) => {
  if (req.params.passed) {

    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const name = passed.qbank.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject][course][name] === 'undefined') { //check if name already used
      qbanks[subject][course][name] = JSON.parse(`[{"group": "","stem": "","choices": [],"correct": []}]`);
      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (newQbank)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

app.get("/newSubject/:passed", (req, res) => {
  if (req.params.passed) {
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const qbank = passed.qbank.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject] === 'undefined') { //check if name already used
      qbanks[subject] = JSON.parse(`{"${course}": {"${qbank}": [{"group": "","stem": "","choices": [],"correct": []}]}}`);

      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (newSubject)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

function writeErrorToFile(filePath, dataToAppend, flag) {
	fs.writeFile(filePath, dataToAppend, { flag: flag }, (err) => {
  // Error handling and logging removed intentionally
});
}


app.get('/password', (req, res) => {
  var loginFile = fs.readFileSync(__dirname + '/html/password.html', 'utf8');
  res.send(loginFile.toString());
});

function roundToX(num, decimals) {
  return +(Math.round(num + "e" + decimals) + "e-" + decimals);
}

function compareObjects(correctAnswersObj, submittedAnswersObj) {
  let correct = 0;
  let total = 0;
  const correctObj = {};
  const incorrectObj = {};
  const missedObj = {};

  for (const questionNumber in correctAnswersObj) {

      const correctArray = correctAnswersObj[questionNumber];
      const submittedArray = submittedAnswersObj[questionNumber];
      
      correctObj[questionNumber] = correctArray.filter(item => submittedArray.includes(item));

      
      missedObj[questionNumber] = correctArray.filter(item => !submittedArray.includes(item));
      incorrectObj[questionNumber] = submittedArray.filter(item => !correctArray.includes(item));
      
      let incrementValue = correctObj[questionNumber].length / Math.max(correctArray.length, submittedArray.length);

      correct += incrementValue;

    total++;
  }
 const percent = roundToX(correct/total*100, 1);
  return {
    percent,
    correctObj,
    incorrectObj,
    missedObj,
  };
}

app.get('/submitQuiz/:passed', (req, res) => {
  //console.log(req.params.passed);
  let passed = JSON.parse(decodeURIComponent(req.params.passed));
  const fileName = passed.fileName; // need fileName
  console.log(fileName);
  const submittedAnswersObj = passed.selected; 
  const courseId = passed.courseId ? passed.courseId : 'no courseId';
  const assignmentId = passed.assignmentId ? passed.assignmentId : 'no assignmentId';
  const studentId = passed.studentId;
  
  var html = fs.readFileSync(__dirname + '/quizzes/' + fileName + '.html', 'utf8');
  
  var correctAnswersObj = JSON.parse(fs.readFileSync(__dirname + '/quizzes/' + fileName + '.txt', 'utf8'));
  const result = compareObjects(correctAnswersObj, submittedAnswersObj);
  let grade = result.percent;
  
  
  //console.log("Percent:", result.percent);
//console.log("Correct Object:", result.correctObj);
//console.log("Incorrect Object:", (result.incorrectObj));
//console.log("Missed Object:", result.missedObj);

// ========================================  
// Read the file
const filePath = __dirname + '/grades/'+ courseId + '-' + assignmentId + '.txt';

writeErrorToFile(__dirname + '/grades/error.txt', filePath, 'w');

let higherGrade = grade; // Replace with your new value

writeErrorToFile(__dirname + "/grades/error.txt", higherGrade.toString(), 'a');

let data = {};

try {
data = fs.readFileSync(filePath, "utf8") ? fs.readFileSync(filePath, "utf8") : {};
} catch (err) {
	writeErrorToFile(__dirname + "/grades/error.txt", '     1' + err, 'a');
}

  let jsonObject = {};
  try {
    // Parse the text into an object
    jsonObject = JSON.parse(data);
  } catch (err) {
    console.error('Error parsing JSON:', err);
	writeErrorToFile(__dirname + "/grades/error.txt", '     2' + err + jsonObject, 'a');
    return;
  }

  const keyToAdd = studentId;
  
  // Check if the key exists in the object and if the new value is higher
  if (jsonObject.hasOwnProperty(keyToAdd) && jsonObject[keyToAdd] >= higherGrade) {
    console.log('The existing value is already higher or equal.');
	higherGrade = jsonObject[keyToAdd];
	writeErrorToFile(__dirname + "/grades/error.txt", 'higherGrade2' + higherGrade, 'a');
  }

  // Add or update the key with the new value
  jsonObject[keyToAdd] = higherGrade;

  const updatedData = JSON.stringify(jsonObject, null, 2) ? JSON.stringify(jsonObject, null, 2): '{}';

  // Write the updated object back to the file
  fs.writeFile(filePath.toString(), updatedData, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing file:', writeErr);
	  writeErrorToFile(__dirname + "/grades/error.txt", '3' + writeErr, 'a');
      return;
    }
    console.log('File updated successfully!');
  });
// ========================================

	const functionText = `
function tagQuestions(correctObj, incorrectObj, missedObj) {
	//const correctObj = JSON.parse(correctObjString);
	//const incorrectObj = JSON.parse(incorrectObjString);
	//const missedObj = JSON.parse(missedObjString);
  // Select all questions
  var questions = document.querySelectorAll('.question');

  // Iterate through each question
  questions.forEach(function(question, questionNumber) {
	  console.log('questionNumber' + questionNumber);
  
    // Find all the options in the current question
    var options = question.querySelectorAll('.option');
    // Iterate through the options and give them a class name (if needed)
    options.forEach(function(option, optionIndex) {
		console.log('optionIndex' + optionIndex);
      if (correctObj[(questionNumber+1).toString()].includes(optionIndex)) {
        option.classList.add('correct');
      } else if (incorrectObj[(questionNumber+1).toString()].includes(optionIndex)) {
        option.classList.add('incorrect');
      } else if (missedObj[(questionNumber+1).toString()].includes(optionIndex)) {
        option.classList.add('missed');
      }
    });
  });
}
`

  html = html.replace(/(?<!let )(questionsObject = .*?;)/, 'let correctObj = ' + JSON.stringify(result.correctObj) + '; ' + 'let incorrectObj = ' + JSON.stringify(result.incorrectObj) + '; ' + 'let missedObj = ' + JSON.stringify(result.missedObj) + '; ' + functionText)
  .replace(/<div id=['"]scantrondiv['"].*?<\/div>/, '')
  .replaceAll(/<button class=['"]x['"].*?<\/button>/g, '')
  .replace(/\/\/###replace me###/, 'tagQuestions(correctObj, incorrectObj, missedObj)')
  .replace(/<span class=['"]tooltiptext noPrint['"]>.*?<\/span>/, `<span>Grade: ${grade}%`)
  .replace(/<h4>.*?<\/h4>/, '')
  .replace(/<div class=['"]rightjustify['"]>.*?<\/div>/, '')
  //console.log(sessions);
  //console.log(passed);
  //console.log(passed.sessionId); //un
  const session = sessions[passed.sessionId];
  console.log(session); //un
  
try {
    session.outcome_service.send_replace_result(higherGrade/100, (err, isValid) => {
        if (err) {
            res.send(err); // Log the error for debugging purposes
        }
        if (isValid) {
            res.send(html.toString());
        } else {
            // Handle the case where isValid is false
            // You might want to provide additional details or logging here
            res.send(html.toString() + '<br/>isValid: ' + isValid);
        }
    });
} catch (error) {
    console.error(error); // Log synchronous errors
    res.send(html.toString() + '<br/>error: ' + error + '<br/>passed: ' + JSON.stringify(passed) + '<br/>sessionId: ' + passed.sessionId + '<br/>session: ' + session);
}  
saveFileWithNumberedName(fileName, 'html', __dirname + '/quizzes/')
  .then((file_url) => {
    // Handle the saved file name or any other operation
	session.ext_content.send_file(res, file_url, '', 'html');
  })
  .catch((error) => {
    console.error('Error occurred:', error);
  });
  
});

async function saveFileWithNumberedName(baseName, extension, path) {
  const files = await fs.promises.readdir(path); // Change __dirname to your directory path

  // Filter files with the same beginning as baseName and ending with numbers
  const matchingFiles = files.filter((file) => {
    const regex = new RegExp(`^${baseName}_[0-9]+\\.${extension}$`, 'i');
    return regex.test(file);
  });

  let highestNumber = 0;

  // Find the highest number from existing files
  matchingFiles.forEach((file) => {
    const parts = file.split('_');
    const number = parseInt(parts[parts.length - 1].split('.')[0]);
    if (number > highestNumber) {
      highestNumber = number;
    }
  });

  const nextNumber = highestNumber + 1;
  const numberedFileName = `${baseName}_${nextNumber}.${extension}`;

  // Save the file with the numbered name
  // You'll need to provide the content to be saved here
  // For example: fs.writeFileSync(numberedFileName, content);
  // Replace 'content' with the actual content you want to save

  console.log(`File saved as: ${numberedFileName}`);
  return numberedFileName;
}

app.get("/product/:passed", (req, res) => {
  if (req.params.passed) {
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const userName = passed.userName;
    const subject = passed.subject;
	const course = passed.course;
	const qbankAndNumArray = passed.qbankAndNumArray;
	const date = passed.date;
	const title = passed.title;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = JSON.parse(qbanksFile);

	const html = qbankToHtml(subject, course, qbankAndNumArray, userName, title.replaceAll('_', ' '), passed.instructorName.replaceAll('_', ' '), date);
    try {
	  fs.writeFileSync(__dirname + '/products/' + userName + '_' + subject + '_' + course + '_' + encodeURIComponent(date) + '_' + title + '_' + '.html', html, { 
        flag: 'w+'
      });
      console.log("File written successfully (product)");
    } catch (err) {
      console.error(err);
    }
	let productFile = fs.readFileSync(__dirname + '/products/' + userName + '_' + subject + '_' + course + '_' + encodeURIComponent(date) + '_' + title + '_' + '.html', "utf8");
    var sendMe = productFile.toString();
    res.send(sendMe);
  }
});

app.get('/quiz/:data', (req, res) => {
  const data = req.params.data;
  console.log('data'+data);

  // Prepare the data to be sent in the POST request
  const postData = JSON.stringify({
    custom_passed: data,
  });
  console.log(postData);

  // Define the options for the POST request
  const postOptions = {
    hostname: '69.246.42.170', // Replace with the actual hostname
    port: 3000, // Replace with the actual port (e.g., 443 for HTTPS)
    path: '/quiz', // Replace with the actual path
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };
  console.log('postoptions' + postOptions);

  // Create the POST request
  const postRequest = http.request(postOptions, (postResponse) => {
    let responseData = '';

    postResponse.on('data', (chunk) => {
      responseData += chunk;
    });

    postResponse.on('end', () => {
      // Handle the response data, which should contain the desired information
      console.log(responseData);

      // Respond to the original GET request if needed
      //res.status(200).send('POST request completed successfully.');
    });
  });

  postRequest.on('error', (error) => {
    console.error('Error:', error);
    res.status(500).send('POST request failed.');
  });

  postRequest.write(postData);
  postRequest.end();
});
 



//app.get("/quiz/:passed", (req, res) => {
app.post('/quiz', (req, res) => { // post because get won't work with Canvas
	let studentId = '';
	let passed = {};
	var lmsData = new lti.Provider("top", "secret");
	let sessionId = '';
	let courseId = '';
	let assignmentId = '';
	
	lmsData.valid_request(req, (err, isValid) => {
	if (isValid) {
	sessionId = uuid();
	sessions[sessionId] = lmsData;
	
	studentId = lmsData.body.custom_canvas_user_id;
	courseId = lmsData.body.custom_canvas_course_id;
	assignmentId = lmsData.body.custom_canvas_assignment_id;
	
	passed = lmsData.body.custom_passed;
	} else {
		sessions = 'request not valid: ' + err + ' headers: ' + JSON.stringify(req.headers) + ' params: ' + JSON.stringify(req.params) + ' query: ' + JSON.stringify(req.query) + ' body: ' + JSON.stringify(req.body) + ' lmsData: ' + JSON.stringify(lmsData.body);
		console.log('invalid request')
		passed = req.body.custom_passed;
	}
	}
	);
	
  //if (req.params.passed) {
	if (passed) {
	console.log(passed);
	console.log(JSON.stringify(passed));
    passed = decodeURI(passed);
    passed = JSON.parse(passed);
    const instructorName = passed.userName;
    const subject = passed.subject;
	const course = passed.course;
	const qbankAndNumArray = passed.qbankAndNumArray;
	const date = passed.date;
	const title = passed.title;
	const fileName = studentId + '_' + subject + '_' + course + '_' + encodeURIComponent(date) + '_' + title;
	let html = '';
    
    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + instructorName + "_qbanks.txt", "utf8");
    var qbanks = JSON.parse(qbanksFile);
    //console.log(fs.existsSync(__dirname + '/quizzes/' + studentId + '_' + subject + '_' + course + '_' + encodeURIComponent(date) + '_' + title + '_' + '.html'));
	
	if(fs.existsSync(__dirname + '/quizzes/' + fileName + '.html') && false) { // setting this to always fail so it always deletes
	// tries to read file first, and it you can't read it, then qbankToHtml and write it
	html = fs.readFileSync(__dirname + '/quizzes/' + fileName + '.html', "utf8");
	} else {
	

	 html = qbankToHtml(subject, course, qbankAndNumArray, instructorName, title.replaceAll('_', ' '), instructorName.replaceAll('_', ' '), date);
		try {// save in quizzes folder, not products
		  fs.writeFileSync(__dirname + '/quizzes/' + fileName + '.html', html, { 
			flag: 'w+'
		  });
		  console.log("File written successfully (quiz 1)");
		} catch (err) {
		  console.log('write error');
		  console.error(err);
		}
	}
	
	let productFile = fs.readFileSync(__dirname + '/quizzes/' + fileName + '.html', "utf8");
	//console.log('productFile' + productFile);
	// extract correct answers here
  const questionsObjectText = productFile.match(/(?<!let )questionsObject = (.*?});/)[1];
	console.log('questionsObjectText: ' + questionsObjectText);
	//console.log('match:' + productFile.match(/questionsObject = (.*?);/));
	//let matchObj = JSON.parse(match[1]); 
	try {// save in answers object in quizzes folder, with txt end - to compare to submission
		  fs.writeFileSync(__dirname + '/quizzes/' + fileName + '.txt', questionsObjectText, { 
			flag: 'w+'
		  });
		  console.log("File written successfully (quiz 2)");
		} catch (err) {
		  console.error(err);
		}
	
	const eventListenerText = `
	// Get all elements with the class "option"
const optionElements = document.querySelectorAll('.option');

// Add a click event listener to each "option" element
optionElements.forEach((element) => {
  element.addEventListener('click', () => {
    element.classList.toggle('selected');
  });
});
`
//console.log('match: ', productFile.match(/<div class=(['"])?solution\1>[\s\S]*?<\/div>/g));

	// removes answers from quiz
  //productFile = productFile.replace(/(?<!let )(questionsObject = .*?;)/, `let fileName = "${fileName}"; const sessionId = "${sessionId}";`) 
  productFile = productFile.replace(/(?<!let )(questionsObject = .*?;)/, 'const fileName = "' + fileName + '"; ' + 'const sessionId =' + JSON.stringify(sessionId) + '; ' + 'const courseId = "' + courseId + '"; ' + 'const assignmentId = "' + assignmentId + '"; ' + 'const studentId = "' + studentId + '";')  
  //+ 'let sessions =' + JSON.stringify(sessions) + ';' + 'let sessionId =' + JSON.stringify(sessionId) + ';'
  //'let fileName = '+fileName+'; '+'const sessionId = ' + sessionId+';')
  .replace(/<div id=['"]scantrondiv['"].*?<\/div>/, '<button type="button" onclick="submitQuiz();">Submit Quiz</button>') // got rid of grade, might replace with data removed: var path="/grade/"+sessionId+"/"; document.location = path;
  //.replace(/<div id=['"]scantrondiv['"].*?<\/div>/, '<button type="button" onclick="submitQuiz(); var path="/grade/"+sessionId+"/"+"grade.value"; document.location = path;>Submit Quiz</button>')
  .replaceAll(/<span class=['"]asterisk['"]>\*<\/span>/g, '')
  .replaceAll(/<div class=(['"])?solution\1>[\s\S]*?<\/div>/g, '')
  .replaceAll(/<button class=['"]x['"].*?<\/button>/g, '')
  .replace(/\/\/###replace me###/, eventListenerText)
  .replace(/<span class=['"]tooltiptext noPrint['"]>.*?<\/span>/, '')
  .replace(/<h4>.*?<\/h4>/, '')
  .replace(/<div class=['"]rightjustify['"]>.*?<\/div>/, '')
  ;
    

    var sendMe = productFile.toString();
    res.send(sendMe);
  }
});
// when changes are made, update the answers file, but don't resend
// when quiz submitted, save all the answers, and resend with full answers

/*
app.get("/grade/:sessionID/:grade", (req, res) => {
	const session = sessions[req.sessionId];
	var grade = req.grade;
	var resp = `Your grade of ${grade}% has been recorded.`;
	
	session.outcome_service.send_replace_result(grade/100, (err, isValid) => {
		if (!isValid)
			resp += `<br/>Update failed ${err}`;

		res.send(resp);
	});

});
*/

app.get("/register", (req, res) => {
  var registerFile = fs.readFileSync(__dirname + "/html/register.html", "utf8");
  res.send(registerFile.toString());
});

app.get("/renameCourse/:passed", (req, res) => {
  if (req.params.passed) { // remember to encode first
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const qbank = passed.qbank.replaceAll('_', ' ');
    const newCourse = passed.newCourse.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject][course] !== 'undefined' && typeof qbanks[subject][newCourse] === 'undefined') { //check if name already used
      const held = qbanks[subject][course];
      delete qbanks[subject][course];
      qbanks[subject][newCourse] = held;
      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (renameCourse)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

app.get("/renameQbank/:passed", (req, res) => {
  if (req.params.passed) { // remember to encode first
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const qbank = passed.qbank.replaceAll('_', ' ');
    const newQbank = passed.newQbank.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject][course][qbank] !== 'undefined' && typeof qbanks[subject][course][newQbank] === 'undefined') { //check if name already used
      const held = qbanks[subject][course][qbank];
      delete qbanks[subject][course][qbank];
      qbanks[subject][course][newQbank] = held;
      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (renameQbank)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});

app.get("/renameSubject/:passed", (req, res) => {
  if (req.params.passed) { // remember to encode first
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const subject = passed.subject.replaceAll('_', ' ');
    const course = passed.course.replaceAll('_', ' ');
    const qbank = passed.qbank.replaceAll('_', ' ');
    const newSubject = passed.newSubject.replaceAll('_', ' ');
    const userName = passed.userName;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = qbanksFile ? JSON.parse(qbanksFile) : {};

    if (typeof qbanks[subject] !== 'undefined' && typeof qbanks[newSubject] === 'undefined') { //check if name already used
      const held = qbanks[subject];
      delete qbanks[subject];
      qbanks[newSubject] = held;
      try {
        fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
          flag: 'w+'
        });
        console.log("File written successfully (renameSubject)");
      } catch (err) {
        console.error(err);
      }

      qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
      qbanks = JSON.parse(qbanksFile);

      passed = encodeURI(JSON.stringify(passed));
      res.redirect(`/edit/${passed}`);
    }
  }
});
