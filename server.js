// express (MIT), fs (MIT), peg parser, (Free, MIT), tinyMCE (LGPL), mathJAX (apache), tinymce-mathjax (MIT)

const express = require('express'); // express server
const http = require('http');
var fs = require('fs'); // file system
var parser = require(__dirname + '\\parser.js'); // parser for =[] calculations
const bcrypt = require('bcrypt'); // for hashing passwords
const path = require("path"); // not sure if this is needed
const app = express();
const threeHours = 10800000;
const server = http.createServer(app); // not sure if this is important

app.use(express.urlencoded({ // increases the limit on what is sent via url - not sure if needed anymore
  limit: '5mb',
  extended: true // not sure about
}));

// create product, images, and user directories if they don't exist
if (!fs.existsSync(__dirname + '/products')){fs.mkdirSync(__dirname + '/products');}
if (!fs.existsSync(__dirname + '/images')){fs.mkdirSync(__dirname + '/images');}
if (!fs.existsSync(__dirname + '/qbanks')){fs.mkdirSync(__dirname + '/qbanks');}
				 
// access to files and folders
app.use('/js', express.static(__dirname + '/js/'));
app.use('/html', express.static(__dirname + '/html/'));
app.use('/products', express.static(__dirname + '/products/'));
app.use('/css', express.static(__dirname + '/css/'));
app.use('/images', express.static(__dirname + '/images/'));
app.use('/node_modules', express.static(__dirname + '/node_modules/'));
app.use('/users', express.static(__dirname + '/users/'));
app.use('/qbanks', express.static(__dirname + '/qbanks/'));

// reads files
var indexFile = fs.readFileSync(__dirname + "/html/index.html", "utf8");
var files = fs.readdirSync(__dirname + "/images/");
var headFile = fs.readFileSync(__dirname + "/html/head.txt", "utf8");
var users = JSON.parse(fs.readFileSync(__dirname + "/users/users.txt", "utf8"));
var lastActivity = JSON.parse(fs.readFileSync(__dirname + "/users/lastactivity.txt", "utf8"));

// calculates next file number to be used
var imageNumberArray = [];
files.forEach(function(file) {
  let numbArray = file.split('.');
  imageNumberArray.push(numbArray[0]);
});
imageNumberArray.sort((a, b) => a - b);
imageNumberArray.reverse();
var maxImageNumber = imageNumberArray[0] ? parseInt(imageNumberArray[0]) : 0; // incremented later
var nextImageNumber = 0;

// const listener = app.listen(process.env.PORT, () => { //random port
/*
const listener = app.listen(3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
*/
const listener = server.listen(3000, () => {
  console.log("Your server is listening on port " + listener.address().port);
});

// functions

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

function minMaxType(variable) {
  try {
    let regex = '(?<=\\$\{)(.+?)(?=\\s)'; // matches between ${ and first space
    const letter = variable.match(regex)[0];
    const min = variable.match(/(?<=\s)(.+?)(?=\s|})/)[0]; // matches between first space and either second space or }
    const minSigFigs = getSigFigs(min);
    const max = variable.match(/(?<=\d\s)(.+?)(?=\s|})/) ? variable.match(/(?<=\d\s)(.+?)(?=\s|})/)[0] : min * 10; // matches between first space after a digit and either space or } defaults to 10 times min number
    const maxSigFigs = getSigFigs(max);
    regex = new RegExp('(?<=' + max + '\\s)(.*)(?=})', 'i'); // matches between max number and }
    const sigFigs = variable.match(regex) ? variable.match(regex)[0] : Math.min(parseInt(minSigFigs), parseInt(maxSigFigs)); //consider changing
    let newNumber = Math.random() * (parseFloat(max) - parseFloat(min)) + parseFloat(min);
    newNumber = newNumber.setSigFigs(sigFigs);
    return [letter, newNumber.toString()];
  } catch (err) {
    console.error('minMaxType variable error: ' + variable + ' ; error: ' + err);
  }
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
    console.log("File written successfully");
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
    nextImageNumber = nextImageNumber + 1;
    let imageTypeArray = [];
    imageTypeArray = data.match(/(?<=src="data:image\/)(.*?)(?=;)/);
    let imageType = imageTypeArray[0];
    data.match(/(?<=src="data:image\/)(.*?)(?=;)/);
    const fileName = (nextImageNumber) + '.' + imageType;
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

      var regex = new RegExp(`\\$\{${replace}(.*?)\}`, 'g');
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
        string = string.replaceAll(array, arrayObj[array]);
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
  let n = Number(this.toPrecision(sf)).toString();
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
  return n;
};

function shuffleArray(arr) {
  arr.sort(() => Math.random() - 0.5);
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

function qbankToHtml(shallowQbank, title) {
  let qbank = deepCopyFunction(shallowQbank);
  let html = headFile.replace('${title}', title);
  let questionNumber = 1;

  let groupObj = {};
  for (let i = 0; i < qbank.length; i++) {
    if (typeof qbank[i]['group'] !== 'undefined' && qbank[i]['group'] !== '') {
      const groupName = qbank[i]['group'];
      if (typeof groupObj[groupName] === 'undefined') {
        groupObj[groupName] = [];
      }
      groupObj[groupName].push(i);
    }
  }

  let indexesToDelete = [];
  for (let group of Object.keys(groupObj)) {
    const keep = Math.floor(Math.random() * groupObj[group].length);
    groupObj[group].splice(keep, 1);
    indexesToDelete = indexesToDelete.concat(groupObj[group]);
    for (let index of indexesToDelete) {
      qbank.splice(index, 1);
    }
  }

  shuffleArray(qbank);
  for (let question of qbank) {
    const stem = question.stem;
    html = html + `<div class='question'>${questionNumber}) ${stem}<br>`;
    questionNumber = questionNumber + 1;
    const correct = question.correct;
    let choices = question.choices;
    let asterisk = '';
    let answerArray = [];

    let choiceNumber = 0;
    for (let choice of choices) {
      if (choice.replaceAll(' ','') != '') { 
        if (correct.includes(choiceNumber.toString())) {
          asterisk = `<span class='asterisk'>*</span>`;
        } else {
          asterisk = '';
        }
        answerArray.push(`${choice}${asterisk}</div>`);
        choiceNumber = choiceNumber + 1;
      }
    }
    if (!question.rqo) {
      shuffleArray(answerArray);
    }

    let answerNumber = 0;
    let optionLetter = '';
    for (let answer of answerArray) {
      optionLetter = String.fromCharCode(answerNumber + 65);
      answerArray[answerNumber] = `<div class='option'>${optionLetter}) ` + answer;
      answerNumber = answerNumber + 1;
    }

    for (let each of answerArray) {
      html = html + each;
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

    html = html + `<p></p></div>`;
    // replace variables with numbers
    try {
      html = replaceVariables(html);
    } catch (err) {
      console.error('replacevar: ' + err);
    }
  }
  html = html + '</body></html>';

  const reg = new RegExp('(?<!\.\.\/)(images)', 'g');
  try {
    html = html.replaceAll(reg, '..\/images');
  } catch (err) {
    console.error(err);
  }

  // parse equations

  let regex = new RegExp(/(?<==\[)(.*?)(?=\])/, 'g');
  const equationsSFs = html.match(regex);

  if (equationsSFs != null) {

    for (let equationSF of Object.values(equationsSFs)) {
      const equationSFArray = equationSF.split('; ');
      const equation = equationSFArray[0];
      //  need to find a solution to scientific notation with e/E later: let equation2 = equation.replaceAll(/(\d)e(\d)/g,'$1*10^$2').replaceAll(/(\d)E(\d)/g,'$1*10^$2');
      const SF = equationSFArray[1] ? equationSFArray[1] : 3; // defaults oto 3 significant figures in equations
      let solution = parser.parse(equation.replaceAll(/ \(\d+ sf\)/g, ''));
      try {
        solution = parseFloat(solution).setSigFigs(SF);
      } catch (err) {
        console.error('error: ' + err + ' equation: ' + equation + 'solution: ' + solution);
      } //maybe change this to popup

      // convert >10k and <0.0001 to scientific notation
      let solutionNum = solution * 1;
      let exp;


      if (Math.abs(solutionNum) >= 10000) {
        exp = Math.floor(Math.log(solutionNum) / Math.log(10));
        solutionNum = solutionNum / (10 ** exp);
        solution = solutionNum + 'x10' + '<sup>' + exp + '</sup>';
      } else if (Math.abs(solutionNum) < 0.00001) {
        exp = Math.ceil(Math.log(solutionNum) / Math.log(10));
        solutionNum = solutionNum / (10 ** exp);
        solution = solutionNum + 'x10^' + exp;
      }
      html = html.replaceAll('=[' + equationSF + ']', solution.toString());
    }
  } else {
    console.log('null equations');
  }
  return (html);
}

function varToArray(varable) {
  return toArray(varable.replaceAll('$', '').replaceAll('{', '').replaceAll('}', ''));
}

// posts
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
      res.send("<div align ='center'><h2>Invalid email or password</h2></div><br><br><div align ='center'><a href='./login'>login again</a></div>");
    }
  } else {

    let fakePass = `$2b$$10$ifgfgfgfgfgfgfggfgfgfggggfgfgfga`;
    await bcrypt.compare(req.body.password, fakePass);

    res.send("<div align ='center'><h2>Invalid email or password</h2></div><br><br><div align='center'><a href='./login'>login again<a><div>");
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
      console.log("File written successfully");
    } catch (err) {
      console.error(err);
    }

    try {
      fs.writeFileSync(__dirname + "/qbanks/" + req.body.username + "_qbanks.txt", '{}', {
        flag: 'w+'
      });
      console.log("File written successfully");
    } catch (err) {
      console.error(err);
    }

    res.send("<div align ='center'><h2>Registration successful</h2></div><br><br><div align='center'><a href='./login'>login</a></div><br><br><div align='center'><a href='./register'>Register another user</a></div>");
  } else {
    res.send("<div align ='center'><h2>Email already used</h2></div><br><br><div align='center'><a href='./register'>Register again</a></div>");
  }
});

// when form data needed, save, add, duplicate, delete
app.post("/submit", (req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body)); // is this stringify/parse needed?
  let userName = obj.userName;

  var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
  var qbanks = JSON.parse(qbanksFile);

  if (typeof obj.deleteQuestion === 'undefined') {
    if (typeof obj.addBlank === 'undefined') {
      //duplicating question
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
      newQuestion.choices = choiceArray; //needs if statement?

      newQuestion.correct = correctArray;

      const aotacb = obj.all_of_the_above_cb;
      const notacb = obj.none_of_the_above_cb;

      if (obj.all_of_the_above) {
        newQuestion.aota = aotacb == 'on';
      }
      if (obj.none_of_the_above) {
        newQuestion.nota = notacb == 'on';
      }

      if (obj.retain_question_order) {
        newQuestion.rqo = obj.retain_question_order = 'on';
      }

      if (obj.duplicateQuestion) {
        qbanks = spliceQuestion(obj, newQuestion, qbanks);
      } else {
        qbanks[obj.subject][obj.course][obj.question_bank][obj.question_number - 1] = newQuestion;
      }
    } else {
      // blank question
      let newQuestion = {
        stem: "",
        choices: [""],
        correct: [],
        group: ''
      };
      qbanks = spliceQuestion(obj, newQuestion, qbanks);
    }
  } else {
    // delete question
    qbanks = spliceQuestion(obj, null, qbanks, true);
  }

  try {
    fs.writeFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", JSON.stringify(qbanks), {
      flag: 'w+'
    });
    console.log("File written successfully");
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
        console.log("File written successfully");
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
        console.log("File written successfully");
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
        console.log("File written successfully");
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
          var nextImageNumber = ${maxImageNumber}+1;
					var user = '${passed.userName}'; 
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
    console.log("File written successfully");
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
        console.log("File written successfully");
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
        console.log("File written successfully");
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
        console.log("File written successfully");
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

app.get("/product/:passed", (req, res) => {
  if (req.params.passed) {
    let passed = decodeURI(req.params.passed);
    passed = JSON.parse(passed);
    const userName = passed.userName;
    const subject = passed.subject;

    var qbanksFile = fs.readFileSync(__dirname + "/qbanks/" + userName + "_qbanks.txt", "utf8");
    var qbanks = JSON.parse(qbanksFile);

    const html = qbankToHtml(qbanks[subject][passed.course][passed.qbank], passed.title.replaceAll('_', ' '));
    try {
      fs.writeFileSync(__dirname + '/products/' + passed.userName + '_' + passed.subject + '_' + passed.course + '_' + passed.qbank + '_' + passed.title + '_' + '.html', html, {
        flag: 'w+'
      });
      console.log("File written successfully");
    } catch (err) {
      console.error(err);
    }

    let productFile = fs.readFileSync(__dirname + '/products/' + passed.userName + '_' + passed.subject + '_' + passed.course + '_' + passed.qbank + '_' + passed.title + '_' + '.html', "utf8");
    var sendMe = productFile.toString();
    res.send(sendMe);
  }
});

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
        console.log("File written successfully");
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
        console.log("File written successfully");
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
        console.log("File written successfully");
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
