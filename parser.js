exports.parse = function(formula) {
  try {
	  	console.log('formula Before XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
	console.log(formula);
    // Replace custom symbols/text with JavaScript operators/functions
    formula = formula.replaceAll(/(\d)\+\((-\d+)\)/g, '$1$2')  
                     .replaceAll(/(\d)\+\((\+\d+)\)/g, '$1$2') 
                     .replaceAll(/(\d)\-\((\-\d+)\)/g, '$1-$2') 
                     .replaceAll(/(\d)\-\(\+(\d+)\)/g, '$1-$2')
                     .replaceAll(/--/g, '+')
                     .replaceAll(/\+\+/g, '+')
                     .replaceAll(/-\+/g, '-')
                     .replaceAll(/\+-/g, '-')
                     .replaceAll(/\*/g, '*')
                     .replaceAll(/\//g, '/')
                     .replaceAll(/\^/g, '**')
                     .replaceAll(/log\((.*?)\)/g, 'Math.log10($1)')
                     .replaceAll(/ln\((.*?)\)/g, 'Math.log($1)')
                     .replaceAll(/e\^(.*?)/g, 'Math.exp($1)');
	console.log('formula')
	console.log(formula);

    const e = Math.E; // Define Euler's number

    const result = eval(formula); // Using eval() to evaluate the modified formula
    return result;
  } catch (error) {
    return 'Error: Invalid formula'; // Handling errors, e.g., syntax errors in the formula
  }
};