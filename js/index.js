function sortObj(obj) {
  return Object.keys(obj).sort(function(a, b) {
    var aParts = a.toLowerCase().match(/([a-z]+)|(\d+)/g);
    var bParts = b.toLowerCase().match(/([a-z]+)|(\d+)/g);

    for (var i = 0; i < Math.min(aParts.length, bParts.length); i++) {
      var aPart = aParts[i];
      var bPart = bParts[i];

      if (isNaN(aPart) && isNaN(bPart)) {
        // Both parts are non-numeric, perform alphabetical comparison
        var result = aPart.localeCompare(bPart);
        if (result !== 0) {
          return result;
        }
      } else if (!isNaN(aPart) && !isNaN(bPart)) {
        // Both parts are numeric, perform numerical comparison
        var aNum = parseInt(aPart);
        var bNum = parseInt(bPart);
        if (aNum !== bNum) {
          return aNum - bNum;
        }
      } else {
        // One part is numeric, the other is non-numeric
        // Sort non-numeric before numeric
        return isNaN(aPart) ? -1 : 1;
      }
    }

    // If all parts are the same up to the minimum length, compare lengths
    return aParts.length - bParts.length;
  }).reduce(function(result, key) {
    result[key] = obj[key];
    return result;
  }, {});
}


/*
function sortObj(obj) {
  return Object.keys(obj).sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase());}).reduce(function (result, key) {
    result[key] = obj[key];
    return result;
  }, {});
}
*/

/*function sortObj(obj) {
if(obj){
  let keyArray = [];
  for(let key of Object.keys(obj)) {
	key = key.replaceAll(' ', '_');
	keyArray.push(key);
  }
  keyArray.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase());}); // case insensitive sort
  let sortedKeyArray = [];
  for(let key of keyArray) {
	key = key.replaceAll('_', ' ')
	sortedKeyArray.push(key);  
  }
  return sortedKeyArray
}
}*/

function $(x) {
  return document.getElementById(x);
}

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});

function addBlankQuestion() {
  $('addBlank').checked = true;
  $('userName').value = user;
  $('submit').click();
  $('addBlank').checked = false;
}

function clearAnswerBoxes() {
  var answerBoxes = document.getElementsByClassName('answerbox');
  for (let box of answerBoxes) {
    box.innerHTML = '';
  }
}

function clickInclude(thisid, targetid) {
	if ($(thisid).checked == true) {
		if ($(targetid).checked == false) {
			$(targetid).checked = true;
		}
	}
}

function clearBoxes() {
  var boxes = document.getElementsByClassName('answercheckbox');
  for (let box of boxes) {
    box.checked = false;
  }
}

function createDownloadLink(data, fileName, fileType){
  var a = document.createElement("a");
  a.href = window.URL.createObjectURL(new Blob([data], {type: "text/plain"}));
  a.download = `${fileName}.${fileType}`;
  a.click();
}

function createProduct() {
  let passed = {};
  let title = prompt("Title: ", "Worksheet");
  if (title) {
	
    const subject = $('subject').value;
    const course = $('course').value;
    const qbank = $('question bank').value;  
	  
	const qbankAndNumArray = [{qbankName: qbank, number: qbanks[subject][course][qbank].length.toString()}];
	title = title.replaceAll(' ', '_');
    passed.title = title;
	passed.instructorName = "";
	passed.date = "";
    passed.subject = subject;
    passed.course = course;
	passed.qbankAndNumArray = qbankAndNumArray;
    passed.userName = user;
    passed = JSON.stringify(passed);
    passed = encodeURI(passed)
    var path = `/product/${passed}`;
    window.open(path, '_blank');
  }
}

function deleteCourse() {
  let toDelete = prompt(`Type "delete ${$('course').value}" to delete this course.`);
  if (toDelete == `delete ${$('course').value}`) {
    setCookie('subjectName', $('subject').value, 2);
    setCookie('courseName', 'select course', 0);
    setCookie('qbankName', '', 0);
    setCookie('questionnumber', 0, 0);

    let passed = {};
    passed.subject = $('subject').value.replaceAll(' ', '_');
    passed.course = $('course').value.replaceAll(' ', '_');
    passed.userName = user;
    passed = encodeURI(JSON.stringify(passed));
    document.location = `/deleteCourse/${passed}`;
  } else if (toDelete != null) {
    toDelete = toDelete.replaceAll('delete', '')
    alert(`Course ${toDelete} not found.`)
  }
}

function deleteQbank() {
  const toDelete = prompt(`Type "delete ${$('question bank').value}" to delete this question bank.`);
  if (toDelete == `delete ${$('question bank').value}`) {
    setCookie('subjectName', $('subject').value, 2);
    setCookie('courseName', $('course').value, 2);
    setCookie('qbankName', 'select question bank', 0);
    setCookie('questionnumber', 0, 0);

    let passed = {};
    passed.subject = $('subject').value.replaceAll(' ', '_');
    passed.course = $('course').value.replaceAll(' ', '_');
    passed.qbank = $('question bank').value.replaceAll(' ', '_');
    passed.userName = user;
    passed = encodeURI(JSON.stringify(passed));
    document.location = `/deleteQbank/${passed}`;
  } else if (toDelete != null) {
    toDelete = toDelete.replaceAll('delete', '')
    alert(`Question bank ${toDelete} not found.`)
  }
}

function deleteSubject() {
  const toDelete = prompt(`Type "delete ${$('subject').value}" to delete this subject.`);
  if (toDelete == `delete ${$('subject').value}`) {
    setCookie('subjectName', 'select subject', 0);
    setCookie('courseName', '', 0);
    setCookie('qbankName', '', 0);
    setCookie('questionnumber', 0, 0);

    let passed = {};
    passed.subject = $('subject').value.replaceAll(' ', '_');
    passed.userName = user;
    passed = encodeURI(JSON.stringify(passed));
    document.location = `/deleteSubject/${passed}`;
  } else if (toDelete != null) {
    toDelete = toDelete.replaceAll('delete', '')
    alert(`Subject ${toDelete} not found.`)
  }
}

function deleteThisQuestion() {
  $('deleteQuestion').checked = true;
  if (qbanks[$('subject').value][$('course').value][$('question bank').value].length <= parseInt($('question number').innerHTML)) {
    setCookie('increment', $('question number').innerHTML - 2, 2);
  }
  $('userName').value = user;
  $('submit').click();
  $('deleteQuestion').checked = false;
}

function duplicateThisQuestion() {
  $('duplicateQuestion').checked = true;
  $('userName').value = user;
  $('submit').click();
  $('duplicateQuestion').checked = false;
}

function exportCourse() {
  const data = JSON.stringify (qbanks[$('subject').value][$('course').value]);
  createDownloadLink(data, $('course').value, 'crs');
}

function exportQbank() {
  const data = JSON.stringify (qbanks[$('subject').value][$('course').value][$('question bank').value]);
  createDownloadLink(data, $('question bank').value, 'qbk');
}

function exportSubject() {
  const data = JSON.stringify (qbanks[$('subject').value]);
  createDownloadLink(data, $('subject').value, 'sbj');
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function importCourse() {
  const fileList = this.files; /* now you can work with the file list */
  for (let file of fileList) {
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function(fileLoadedEvent) {
      const objFromFileLoaded = JSON.parse(fileLoadedEvent.target.result);
      const fileNameArray = file.name.split('.')
      const fileName = fileNameArray[0];
	  const subjectName = $('subject').value;
      const courseName = prompt('Course title: ', fileName)
      if (typeof qbanks[subjectName][courseName] == 'undefined') {
        importQbanks(objFromFileLoaded, user, subjectName, courseName);
      } else {
		$('import course').value = null;
        alert('Course already exists, please delete course first to replace it, or rename new course.');
      }
    };
  }
}

function importQbank() {
  const fileList = this.files; /* now you can work with the file list */
  for (let file of fileList) {
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function(fileLoadedEvent) {
      const objFromFileLoaded = JSON.parse(fileLoadedEvent.target.result);
      const fileNameArray = file.name.split('.')
      const fileName = fileNameArray[0];
      const subjectName = $('subject').value;
      const courseName = $('course').value;
	  const qbankName = prompt('Question bank title: ', fileName)
      if (typeof qbanks[subjectName][courseName][qbankName] == 'undefined') {
        importQbanks(objFromFileLoaded, user, subjectName, courseName, qbankName);
      } else {
		$('import question bank').value = null;
        alert('Question bank already exists, please delete question bank first to replace it, or rename new question bank.');
      }
    };
  }
}

function importQbanks(objFromFileLoaded, userName, subjectName, courseName, qbankName) {
  var xhr = new XMLHttpRequest();
  if(subjectName) {setCookie('subjectName', subjectName, 2);}
  if(courseName) {setCookie('courseName', courseName, 2);}
  if(qbankName) {
	setCookie('qbankName', qbankName, 2);
	setCookie('questionnumber', 0, 2)
  }
  
  xhr.open('POST', '/import', true);
  xhr.setRequestHeader('Content-type', 'application/json;charset=UTF-8'); 
  
  xhr.onload = function() {
	let passed = {};
    passed.userName = userName; 
    passed = encodeURI(JSON.stringify(passed));
    document.location = `${passed}`;
  };
  
  const toSend = {
	userName: userName,
	subjectName: subjectName,
	courseName: courseName,
	qbankName: qbankName
  };
  toSend.objFromFileLoaded = objFromFileLoaded;
  xhr.send(JSON.stringify(toSend));
}

function importSubject() {
  const fileList = this.files; /* now you can work with the file list */
  for (let file of fileList) {
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function(fileLoadedEvent) {
      const objFromFileLoaded = JSON.parse(fileLoadedEvent.target.result);
      const fileNameArray = file.name.split('.')
      const fileName = fileNameArray[0];
      const subjectName = prompt('Subject title: ', fileName)
      if (typeof qbanks[subjectName] == 'undefined') {
        importQbanks(objFromFileLoaded, user, subjectName);
      } else {
		$('import subject').value = null;
        alert('Subject already exists, please delete subject first to replace it, or rename new subject.');
      }
    };
  }
}

function incrementQuestionNumber() {
  let numb = parseInt($('question number').innerHTML);
  setCookie('increment', numb, 2);
}

function loading(qbanks) {
  initTinyMce();
  populateDD(qbanks, 'subject');
  refreshing(qbanks);
  $('import subject').addEventListener("change", importSubject, false);
  $('import course').addEventListener("change", importCourse, false);
  $('import question bank').addEventListener("change", importQbank, false);
}

function loadQuestion(qbank, numb) {
  if (typeof qbank != 'undefined') { // checks to see if qbank var defined
    if (numb > qbank.length) { // limits question loaded to length of qbank
      loadQuestion(qbank, qbank.length); //### should this be qbank.length - 1? - probably
    } else if (numb < 0) { // limits question loaded to positive number ### should this be 1? - probably not
      loadQuestion(qbank, 0);
    } else {
      const buttons = document.getElementsByClassName('large material-icons'); // selects all large buttons
      for (let button of buttons) { //enables all large buttons
        button.disabled = false;
      }
      $('rename question bank').disabled = false;
      $('delete question bank').disabled = false;
      $('export question bank').disabled = false;
      if ($('question bank').value != 'select question bank') { // sets cookie when question loaded
	      setCookie('courseName', $('course').value, 2);
		  setCookie('subjectName', $('subject').value, 2);
	      setCookie('qbankName', $('question bank').value, 2);
        $('question number').innerHTML = numb + 1;
        setCookie('questionnumber', numb + 1, 2);
        const question = qbank[numb];
        const stem = question ? question.stem : '';
        const choices = question ? question.choices : [];
        const correct = question ? question.correct : [];
        const group = question ? question.group : '';
		const solution = question ? question.solution ? question.solution : '' : '';
        const letters = [];
        $('group').innerHTML = group;
		
        populateTinyMceOrTextarea('question stem', stem); // need more sophisticated replaceAll

        clearAnswerBoxes();
        const numTextAreasToClear = document.getElementsByClassName('tinymce').length - 2; // doesn't clear solution 
        for (let i = 0; i < numTextAreasToClear; i++) {
          populateTinyMceOrTextarea('choice ' + String.fromCharCode(parseInt(i) + 65), '');
        }

        for (let choice in choices) {
          populateTinyMceOrTextarea('choice ' + String.fromCharCode(parseInt(choice) + 65), choices[parseInt(choice)]); // need better replaceAll
        }
		populateTinyMceOrTextarea('solution', solution); // need better replaceAll?
        clearBoxes();
        for (let ans of correct) {
          $('checkbox ' + String.fromCharCode(parseInt(ans) + 65)).checked = true;
        }
        if (question.aota != undefined) {
          $('all of the above cb').checked = question.aota;
          $('all of the above').checked = true;
        } else {
          $('all of the above cb').checked = false;
          $('all of the above').checked = false;
        }

        if (question.nota != undefined) {
          $('none of the above cb').checked = question.nota;
          $('none of the above').checked = true;
        } else {
          $('none of the above cb').checked = false;
          $('none of the above').checked = false;
        }
		
      if (question.rqo != undefined) {
        $('retain question order').checked = question.rqo;
      }

      } else { // this is IF no question bank
        $('question number').innerHTML = '';
        $('question stem').innerHTML = null;
        clearAnswerBoxes();
        clearBoxes();
      }

      $("left arrow").disabled = false;

      if (numb == null || numb <= 0) {
        $("left arrow").disabled = true;
      }

      $("right arrow").disabled = false;

      if (typeof qbank === 'undefined' || numb >= qbank.length - 1) {
        $("right arrow").disabled = true;
      }
    }
  } else {
		$('rename question bank').disabled = true;
    $('delete question bank').disabled = true;
	}
}

function logout() {
	let passed = {};
	passed.userName = user;
	passed = encodeURI(JSON.stringify(passed));
	var path = `/logout/${passed}`;
	document.location = path;
}

function newCourse() {
  let courseName = prompt("Course: ", "Course name");
  let qbankName = prompt("Question Bank Title: ", "Question bank name");
  if (courseName && qbankName) {
    let passed = {};
    setCookie('courseName', courseName, 2);
    setCookie('qbankName', qbankName, 2);
    setCookie('questionnumber', 0, 2)
    courseName = courseName.replaceAll(' ', '_');
    qbankName = qbankName.replaceAll(' ', '_');
    const subject = $('subject').value;
    if (!qbanks[subject][courseName]) {
      passed.subject = subject;
      passed.course = courseName;
      passed.qbank = qbankName;
      passed.userName = user;
      passed = encodeURI(JSON.stringify(passed));
      var path = `/newCourse/${passed}`;
      document.location = path;
    }
  }
}

function newQbank() {
  let name = prompt("Question Bank Title: ", "Question bank name")
  if (name) {
    let passed = {}
    setCookie('qbankName', name, 2);
    setCookie('questionnumber', 0, 2)
    name = name.replaceAll(' ', '_');
    const subject = $('subject').value;
    const course = $('course').value;
    if (!qbanks[subject][course][name]) { // check
      passed.subject = subject;
      passed.course = course;
      passed.qbank = name;
      passed.userName = user;
      passed = encodeURI(JSON.stringify(passed));
      var path = `/newQbank/${passed}`;
      document.location = path;
    }
  }
}

function newSubject() {
  let subjectName = prompt("Subject: ", "Subject name");
  let courseName = prompt("Course: ", "Course name");
  let qbankName = prompt("Question Bank Title: ", "Question bank name");
  if (subjectName && courseName && qbankName) {
    let passed = {};
    setCookie('subjectName', subjectName, 2);
	alert(subjectName);
    setCookie('courseName', courseName, 2);
    setCookie('qbankName', qbankName, 2);
    setCookie('questionnumber', 0, 2)
    subjectName = subjectName.replaceAll(' ', '_');
    courseName = courseName.replaceAll(' ', '_');
    qbankName = qbankName.replaceAll(' ', '_');
    if (!qbanks[subjectName]) {
      passed.subject = subjectName;
      passed.course = courseName;
      passed.qbank = qbankName;
      passed.userName = user;
      passed = encodeURI(JSON.stringify(passed));
      var path = `/newSubject/${passed}`;
      document.location = path;
    }
  }
}

function populateDD(obj, dropDown) {
  var dd = $(dropDown);
  // clear next drop down
  dd.innerHTML = '';
  // populate next drop down
  var defaultOption = document.createElement('option');
  defaultOption.text = 'select ' + dropDown;
  dd.options.add(defaultOption);
  //alert(JSON.stringify(obj));
  const sortedObj = sortObj(obj);
  for (let item in sortedObj) {
    var option = document.createElement('option');
    option.text = item;
    option.value = item;
    dd.options.add(option);
  }

  const buttons = document.getElementsByClassName('material-icons');

  for (let button of buttons) {
    button.disabled = true;
  }

  $('new subject').disabled = false;
  $('import subject button').disabled = false;
  if ($('subject').value != 'select subject') {
    $('question bank').value = 'select question bank'; // not sure if needed
    $('rename subject').disabled = false;
    $('delete subject').disabled = false;
    $('export subject').disabled = false;
    $('new course').disabled = false;
    $('import course button').disabled = false;
    if ($('course').value != 'select course') {
      $('question bank').value = 'select question bank';
      $('rename course').disabled = false;
      $('delete course').disabled = false;
      $('export course').disabled = false;
      $('new question bank').disabled = false;
      $('import question bank button').disabled = false;
      if ($('question bank').value != 'select question bank') {
        $('rename question bank').disabled = false;
        $('delete question bank').disabled = false;
      }
    }
  }
}

function populateTinyMceOrTextarea(id, newText) {
  // TinyMCE is already initialized, destroy it
  tinymce.EditorManager.execCommand('mceRemoveEditor', true, id);
  // Set the content in the textarea
  $(id).value = newText;
  // Reinitialize TinyMce
  initTinyMce();
}

/*
function populateTinyMceOrTextarea(id, newText) {
  if ($(id).style.display == 'none') {
    // this is a test
	tinymce.EditorManager.editors = []
	//tinymce.activeEditor.destroy();  
	//(id).style.display == 'block';
	//tinymce.get(id).removeChild(id);
	$(id).value = newText;
    initTinyMce();
	
	//tinymce.get(id).setContent(newText);
	console.log(newText);
    //tinymce.get(id).getBody().innerHTML = newText => seems to cause problems
  } else {
    $(id).value = newText;
    initTinyMce();
	console.log('else')
  }
}
*/

function refreshing(qbanks) {
	$('username').innerHTML = `${user}`;
  $('userName').value = `${user}`
  if (document.cookie) {
    const subjectName = getCookie('subjectName') ? getCookie('subjectName') : 'select subject';
    const courseName = getCookie('courseName') ? getCookie('courseName') : 'select course';
    const qbankName = getCookie('qbankName') ? getCookie('qbankName') : 'select question bank';
    let numb = 0;
    if (parseInt(getCookie('increment'))) {
      numb = parseInt(getCookie('increment'));
      setCookie('increment', numb, 0);
    } else {
      numb = parseInt(getCookie('questionnumber')) ? parseInt(getCookie('questionnumber')) - 1 : 0;
    }
    if (typeof qbanks[subjectName] != 'undefined') {
			$('subject').value = subjectName;
			populateDD(qbanks[subjectName], 'course')
      if (typeof qbanks[subjectName][courseName] != 'undefined') {
				$('course').value = courseName;
				populateDD(qbanks[subjectName][courseName], 'question bank')
				if (typeof qbanks[subjectName][courseName][qbankName] != 'undefined') {
				$('question bank').value = qbankName;
				loadQuestion(qbanks[subjectName][courseName][qbankName], numb);
				} else {$('question bank').value = 'select question bank';}
      } else {$('course').value = 'select course';}
    } else {$('subject').value = 'select subject';}
  }
}

function renameCourse() {
  const newName = prompt(`Type the name you want to use to replace "${$('course').value}".`);
  if (newName !== null && newName != '') {
    setCookie('subjectName', $('subject').value, 2);
    setCookie('courseName', newName, 2);
    setCookie('qbankName', $('question bank').value, 2);

    let passed = {};
    passed.subject = $('subject').value.replaceAll(' ', '_');
    passed.course = $('course').value.replaceAll(' ', '_');
    passed.qbank = $('question bank').value.replaceAll(' ', '_');
    passed.userName = user;
    passed.newCourse = newName.replaceAll(' ', '_');
    passed = encodeURI(JSON.stringify(passed));
    document.location = `/renameCourse/${passed}`;
  } else {
    alert('No entry recognized.')
  }
}

function renameQbank() {
  const newName = prompt(`Type the name you want to use to replace "${$('question bank').value}".`);
  if (newName !== null && newName != '') {
    setCookie('subjectName', $('subject').value, 2);
    setCookie('courseName', $('course').value, 2);
    setCookie('qbankName', newName, 2);

    let passed = {};
    passed.subject = $('subject').value.replaceAll(' ', '_');
    passed.course = $('course').value.replaceAll(' ', '_');
    passed.qbank = $('question bank').value.replaceAll(' ', '_');
    passed.newQbank = newName.replaceAll(' ', '_');
    passed.userName = user;
    passed = encodeURI(JSON.stringify(passed));
    document.location = `/renameQbank/${passed}`;
  } else {
    alert('No entry recognized.')
  }
}

function renameSubject() {
  const newName = prompt(`Type the name you want to use to replace "${$('course').value}".`);
  if (newName !== null && newName != '') {
    setCookie('subjectName', newName, 2);
    setCookie('courseName', $('course').value, 2);
    setCookie('qbankName', $('question bank').value, 2);

    let passed = {};
    passed.subject = $('subject').value.replaceAll(' ', '_');
    passed.course = $('course').value.replaceAll(' ', '_');
    passed.qbank = $('question bank').value.replaceAll(' ', '_');
    passed.newSubject = newName.replaceAll(' ', '_');
    passed.userName = user;
    passed = encodeURI(JSON.stringify(passed));
    document.location = `/renameSubject/${passed}`;
  } else {
    alert('No entry recognized.')
  }
}

function saveQuestion() {
  updateCookies($('question number').innerHTML); // is this a problem?
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function resized() { // not used yet
  const h = window.innerHeight;
  document.documentElement.style.setProperty('--height', h);
}

function updateCookies(position) {
  setCookie('subjectName', $('subject').value, 2);
  setCookie('courseName', $('course').value, 2);
  setCookie('qbankName', $('question bank').value, 2);
  setCookie('questionnumber', position, 2)
}

// overlay functions
function populateReord() {
  const qbank = qbanks[$('subject').value][$('course').value][$('question bank').value];
  let index = 0;
  for (let problem of qbank) {
    const listItem = document.createElement('li');
    listItem.setAttribute("draggable", "true");
	const noBreaksStem = problem.stem.replaceAll('<br>', ' ').replaceAll('<p>', ' ');
    const div = document.createElement('div')
    listItem.innerHTML = `<div>Group: ${problem.group}<br>Stem: ${noBreaksStem}</div>`;
    listItem.setAttribute("title", problem.stem);
    listItem.setAttribute("order", index);
    $('sortlist').appendChild(listItem);
    index = index + 1;
  }
}

function reorder() {
  const subjectName = $('subject').value;
  const courseName = $('course').value;
  const qbankName = $('question bank').value;
  const numb = $('question number').innerHTML;
	
  let qbank = qbanks[subjectName][courseName][qbankName];
  const qbankCopy = qbank.slice(); 
  const children = $('sortlist').querySelectorAll('li');
  let orderArray = [];
  children.forEach(child => orderArray.push(parseInt(child.getAttribute('order'))));
  for (let i = 0; i < orderArray.length; i++) {
    qbank[i] = qbankCopy[orderArray[i]];
  }
  
  var xhr = new XMLHttpRequest();
  if(subjectName) {setCookie('subjectName', subjectName, 2);}
  if(courseName) {setCookie('courseName', courseName, 2);}
  if(qbankName) {
	setCookie('qbankName', qbankName, 2);
	setCookie('questionnumber', (orderArray.indexOf(parseInt(numb)-1)+1).toString(), 2)
  }
  
  xhr.open('POST', '/reorder', true);
  xhr.setRequestHeader('Content-type', 'application/json;charset=UTF-8'); 
  
  xhr.onload = function() {
	let passed = {};
    passed.userName = user; 
    passed = encodeURI(JSON.stringify(passed));
    document.location = `${passed}`;
  };
  
  const toSend = {
	userName: user,
	subjectName: subjectName,
	courseName: courseName,
	qbankName: qbankName
  };
  toSend.qbankData = qbank;
  xhr.send(JSON.stringify(toSend));
  
  closeNav();
}

function setProductNum(num) {
	$('product number').value = num;
	$('product number').max = num;
	$('add from dropdown').disabled = false;
}

function populateProductOverlayDropDown() { // condense with populatedd
  var dd = $('product dropdown');
  while (dd.options.length > 0) { // clear dropdown                
        dd.remove(0);
    } 
  var defaultOption = document.createElement('option');
  defaultOption.text = 'select question bank';
  dd.options.add(defaultOption);
  const subjectName = $('subject').value;
  const courseName = $('course').value;
  const sortedObj = sortObj(qbanks[subjectName][courseName]);
  for (let qbank in sortedObj) {
    var option = document.createElement('option');
    option.text = qbank;
    option.value = qbank;
    dd.options.add(option);
  }
  $('product date').value = new Date().toDateInputValue();
}

function addfromdropdown() {
  const order = document.getElementsByClassName('qbankandnum') ? document.getElementsByClassName('qbankandnum').length : 0; //counts elements present
  const qbankName = $('product dropdown').value;
  const number = $('product number').value;

  const qbankAndNum = document.createElement('div');
    qbankAndNum.innerHTML = `${qbankName}: ${number}`;
    qbankAndNum.setAttribute('qbankName', qbankName);
    qbankAndNum.setAttribute('number', number);
	qbankAndNum.setAttribute('class', 'qbankandnum');
	qbankAndNum.setAttribute('order', order);
    $('productlist').appendChild(qbankAndNum);
}

function createAdvancedProduct() {
  const qbankAndNumElements = document.getElementsByClassName('qbankandnum');
  let qbankAndNumArray =[];
  for(let element of qbankAndNumElements) {
	  let qbankAndNum = {};
	  qbankAndNum.qbankName = element.getAttribute('qbankName');
	  qbankAndNum.number = element.getAttribute('number');
	  qbankAndNumArray.push(qbankAndNum)
  }
  let passed = {};
  let title = $('product title').value ? $('product title').value.replaceAll(' ', '_') : ''; //prompt("Title: ", "Worksheet"); //replace this!!!
    passed.title = title;
	passed.instructorName = $('instructor name').value ? $('instructor name').value.replaceAll(' ', '_') : '';
	if ($('product date').value != '') {
	  let date = new Date($('product date').value.split("-").join(", "));
		date = date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	  });
	  passed.date = date;
	} else {
		passed.date = '';
	}
    passed.subject = $('subject').value;
    passed.course = $('course').value;
    passed.qbankAndNumArray = qbankAndNumArray;
    passed.userName = user;
    passed = JSON.stringify(passed);
    passed = encodeURI(passed)
    var path = `/product/${passed}`;
    window.open(path, '_blank');
}

function hideOverlays() {
	const overlays = document.getElementsByClassName("overlay");
  for(let overlay of overlays) {
	  overlay.style.display = "none";
  }
}

function openProductOverlay() {
  const alreadyOpen = productoverlay.style.display == "flex";
  hideOverlays();
  $('productlist').innerHTML = null;
  const productOverlay = document.getElementById("productoverlay")
  if(alreadyOpen) {
	productoverlay.style.display == "none"
  } else {
	productoverlay.style.display = "flex";  
  }
  populateProductOverlayDropDown();
}

function closeProductOverlay() {
  document.getElementById("productoverlay").style.display = "none";
}

function openNav() {
  const myNav =  document.getElementById("myNav"); 
  const alreadyOpen = myNav.style.display == "flex"
  hideOverlays();	
  $('sortlist').innerHTML = null;
  if(alreadyOpen) {
   myNav.style.display == "none";
  } else {
   myNav.style.display = "flex";
  }
  populateReord();
  slist($('sortlist'));
}

function closeNav() {
  document.getElementById("myNav").style.display = "none";
}

function slist(target) {
  // SET CSS + GET ALL LIST ITEMS
  //target.classList.add("slist");
  let items = target.getElementsByTagName("li"),
    current = null;

  // MAKE ITEMS DRAGGABLE + SORTABLE
  for (let i of items) {
    // (B1) ATTACH DRAGGABLE
    i.draggable = true;

    // DRAG START - YELLOW HIGHLIGHT DROPZONES

    i.ondragstart = (ev) => {
      current = i;
    };

    // DRAG OVER - PREVENT THE DEFAULT "DROP", SO WE CAN DO OUR OWN
    i.ondragover = (evt) => {
      evt.preventDefault();
    };

    // (B7) ON DROP - DO SOMETHING
    i.ondrop = (evt) => {
      evt.preventDefault();
      if (i != current) {
        let currentpos = 0,
          droppedpos = 0;
        for (let it = 0; it < items.length; it++) {
          if (current == items[it]) {
            currentpos = it;
          }
          if (i == items[it]) {
            droppedpos = it;
          }
        }
        if (currentpos < droppedpos) {
          i.parentNode.insertBefore(current, i.nextSibling);
        } else {
          i.parentNode.insertBefore(current, i);
        }
      }
    };
  }
}


// tiny mice
function initTinyMce() {
  tinymce.init({
    //mode : "textareas",
    //theme : "advanced",
    force_br_newlines: false,
    force_p_newlines: false,
    forced_root_block: '',
    selector: 'textarea.tinymce',
    browser_spellcheck: true,
    height: 160,
    menubar: false,
    fontsize_formats: "8pt 10pt 10.5pt 11pt 12pt 14pt 18pt 24pt 36pt",

    setup: (editor) => {
      editor.ui.registry.addIcon('expand', '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000" ><g transform="rotate (90,12,12)"><path d="M0 0h24v24H0z" fill="none"/><path d="M0 0h24v24H0V0z" fill="none"/><path d="M4 20h16v2H4zM4 2h16v2H4zm9 7h3l-4-4-4 4h3v6H8l4 4 4-4h-3z" /></g></svg>');

      editor.ui.registry.addIcon('percent', '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><g><g><g><path d="M7.5,11C9.43,11,11,9.43,11,7.5S9.43,4,7.5,4S4,5.57,4,7.5S5.57,11,7.5,11z M7.5,6C8.33,6,9,6.67,9,7.5S8.33,9,7.5,9 S6,8.33,6,7.5S6.67,6,7.5,6z"/></g></g><g><rect height="2" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -4.9706 12)" width="20.63" x="1.69" y="11"/></g><g><g><path d="M16.5,13c-1.93,0-3.5,1.57-3.5,3.5s1.57,3.5,3.5,3.5s3.5-1.57,3.5-3.5S18.43,13,16.5,13z M16.5,18 c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S17.33,18,16.5,18z"/></g></g></g></g></svg>');

      editor.ui.registry.addIcon('list', '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0z" fill="none"/><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>');

      editor.ui.registry.addIcon('calculate', '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M13.03,7.06L14.09,6l1.41,1.41 L16.91,6l1.06,1.06l-1.41,1.41l1.41,1.41l-1.06,1.06L15.5,9.54l-1.41,1.41l-1.06-1.06l1.41-1.41L13.03,7.06z M6.25,7.72h5v1.5h-5 V7.72z M11.5,16h-2v2H8v-2H6v-1.5h2v-2h1.5v2h2V16z M18,17.25h-5v-1.5h5V17.25z M18,14.75h-5v-1.5h5V14.75z"/></g></svg>');

      editor.ui.registry.addButton('${}', {
        text: '${}',
        tooltip: 'Empty Variable Brackets',
        onAction: () => editor.insertContent('${}')
      });

      editor.ui.registry.addButton('RangeVar', {
        icon: 'expand',
        tooltip: 'Range Variable',
        onAction: () => editor.insertContent('${a 10.0 20.0 3}')
      });
      editor.ui.registry.addButton('PercentVar', {
        icon: 'percent',
        tooltip: 'Percent Variable',
        onAction: () => editor.insertContent('${a 15.0 20% 3}')
      });
      editor.ui.registry.addButton('ListVar', {
        icon: 'list',
        tooltip: 'List Variable',
        onAction: () => editor.insertContent('${option 1, option 2}')
      });
      editor.ui.registry.addButton('Calculate', {
        icon: 'calculate',
        tooltip: 'Calculate',
        onAction: () => editor.insertContent('=[4/2]')
      });
    },

    // mathjax 
	plugins: [
      'advlist autolink lists link image charmap print preview anchor',
      'searchreplace visualblocks code fullscreen',
      'insertdatetime media table paste code help wordcount',
	  'mathjax' // not sure if needed
    ],
	
    external_plugins: {
      'mathjax': '/node_modules/@dimakorotkov/tinymce-mathjax/plugin.js'
    },


    mathjax: {
      lib: '/node_modules/mathjax/es5/tex-mml-chtml.js', //required path to mathjax
      symbols: {
        start: '\\(',
        end: '\\)'
      }, //optional: mathjax symbols
      className: "math-tex", //optional: mathjax element class
      configUrl: '/node_modules/@dimakorotkov/tinymce-mathjax/config.js' //optional: mathjax config js
    },

    toolbar: 'undo redo | ' +
      'bold italic superscript subscript forecolor backcolor | image | mathjax | ${} RangeVar PercentVar ListVar Calculate | alignleft aligncenter ' + //mathjax
      'alignright alignjustify | formatselect | fontsizeselect |  bullist numlist outdent indent | ' +
      'removeformat | help',
    image_title: true,
    automatic_uploads: true,
    file_picker_types: 'image',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:10.5pt }',

    file_picker_callback: function(cb, value, meta) {
      var input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');

      input.onchange = function() {
        var file = this.files[0];

        var reader = new FileReader();
        reader.onload = function() {
          /*
            Note: Now we need to register the blob in TinyMCEs image blob
            registry. In the next release this part hopefully won't be
            necessary, as we are looking to handle it internally.
          */
          var id = 'blobid' + (new Date()).getTime();
          var blobCache = tinymce.activeEditor.editorUpload.blobCache;
          var base64 = reader.result.split(',')[1];
          var blobInfo = blobCache.create(id, file, base64);
          blobCache.add(blobInfo);

          /* call the callback and populate the Title field with the file name */
          cb(blobInfo.blobUri(), {
            title: file.name
          });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  });
}
