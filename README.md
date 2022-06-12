# Qbank
 This is a program for creating question banks that can quickly be converted to quizzes, tests, or worksheets with randomizable results.
 
 Example site: qbank.tk
 Email ID: test@test.com
 Password: test

# Install
Download files<br> 
Install [Git](https://git-scm.com/download/win) and [Node.js](https://nodejs.org/en/download/current/)<br>
Open command prompt and navigate to top Qbank folder (where server.js is).
Type npm install into the command prompt<p>

Might need:<br>
  npm install tinymce@^5<br>
  npm install pegjs<br>
  npm install mathjax<p>

# Starting Server
   You can start the server by double clicking on the node server.bat file.<br>
   Open http://localhost:3000 to use.
   Port 3000 is set in the server.js file.
   
# Using variables
Range type: replaces a variable with a number randomly selected from a given range.<br>
  Format: `${letter min max sigfigs}`<br>
  Example: `${a 5.00 10.0 3}` => this will cause all the 'a' variables to be replaced with a number between 5.00 and 10.0 with 3 significant figures.  If the variable is used again in another spot, then you can just use `${a}` and it will be replaced by the same number. <p>
  
Percent type: replaces a variable with a random number within a given percent of a number.<br>
  Format: `${letter mid percent sigfigs}`<br>
  Example: `${b 20 50% 2}` => this will cause all the 'b' variables to be replaced with a number between 10 and 30 with 2 significant figures (+/-50% of 20).  If the   variable is used again in another spot, then you can just use `${b}` and it will be replaced by the same number.  NOTE: the letter 'a' is not associated with the range type, and the letter 'b' is not associated with the percent type.  You can use any letter, or even words.<p>
  
List type: randomly chooses a set of text from a list of alternatives.<br>
  Format: `${option 1, option 2, option 2}`<br>
  Examples: `${red, blue, yellow}` `${big, small, tiny}`.  If both of these lists are used in the same question, then one of each list will be choosen randomly.  However, if the first choice is chosen for one, then the first choice will be chosen for all.  In this case, 'red' and 'big' would always go together, and so would 'blue' and 'small'.  If there was another list with four options, then the fourth option would never be chosen, because there is no corresponding fourth option in the other lists.<p>
  
# Calculations
It is possible to make basic calculations.  This will likely be most helpful in the answer selections.<br>
  Format: `=[calculation; sigfigs]`<br>
  Examples: `=[4/2]` => this would be evaluated as 2.00 since the default is 3 significant figures.
            `=[1/3; 2]` => this would be evaluated as 0.33 since the sig figs are set to 2.
            `=[${a}*${b}; 4]` => this would be evaluated as a x b, depending on what number those variables stood for, then rounded to 4 sig figs.<p>

The answer choices are currently set at up to 4 answers plus the options of adding 'none of the above' and/or 'all of the above'.  'None of the above' and 'all of the above' will always stay at the bottom of a list of answers.  Blank answer choices should not show up in your final product, and if they do, then either the tiny-mce editor is not completely empty, or there is a bug.  The order of the questions are randomized and all answer choices other than 'none of the above' and 'all of the above' are randomized unless you click the 'retain order' checkbox.  The retain order checkbox is for if you want to have answers such as 'both a and b', which would require choices that retain their order.<p>

Note: this is not a secure program (yet).  Logging in is essentially to keep different people's question banks seperate.  
