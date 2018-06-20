# StringStack Base

StringStack/base is a boiler plate for creating new StringStack components.

# Installation

```bash
npm install @stringstack/base --save
```

# Configuration

StringStack/snowflake looks for configuration in the nconf container provided by StringStack/core. Store the 
configuration in nconf at the path ```stringstack:base```.

# Usage

To create a new component from this boiler plate do the following.

1. Copy the directory.
2. Replace all incidents of the word 'base' and 'stringstack/base' with the name of your component. Make sure to keep 
upper/lower case consistent in each replacement.
3. Replace all the links in package.json to reference your git source, etc.
4. Add additional tests to test/general.test.js
5. Add your specific functionality to index.js
6. Write tests for all your new stuff, and use the tests for development!
7. Update this readme file to be relevant to your component so people know how to use it.
8. Maybe check the .gitignore file to make sure it makes sense for your component.
9. Update the copyright date in the LICENSE file... if you really care.
10. Profit

# Testing

You should do test driven development. Why? http://lmgtfy.com/?q=why+do+test+driven+development

Run tests like this.

```bash
npm test
```
