# Create a Theme

If you want to customize the look of the editor, you can do so by creating a theme. Here is a step by step tutorial:

#### Requirements
- Some general programming knowledge
- You need to know how to use CSS

## Step 1: Create a repository
> We'll use GitHub for this tutorial, but you can skip this step if you want to use Gitlab, Bitbucket, ...
To put your project up on GitHub, you'll need to create a repository for it to live in.

##### 1. In the upper-right corner of any page, click , and then click New repository.
![Create a repository on Github](https://help.github.com/assets/images/help/repository/repo-create.png)

##### 2. Type a short, memorable name for your repository. For example, "hello-world".
![Create a repository on Github](https://help.github.com/assets/images/help/repository/create-repository-name.png)

##### 3. Optionally, add a description of your repository. For example, "My first theme for StudIO."
![Create a repository on Github](https://help.github.com/assets/images/help/repository/create-repository-desc.png)

> Make sure you make the repository public, otherwise you won't be able to install the theme on the app.

And finally, click on **Create Repository**

## Step 2: Clone the repository

For this step, please refer to **Create a project**, and simply use the URL of your new repository.

## Step 3: Create a manifest

Open the project, and click on the **+** icon to create `studio-package.json`.

This file should respect the following template:
```js
{
    "name": "Unique name of the package, using Camel Case", /* https://en.wikipedia.org/wiki/Camel_case */
    "title": "Optional: title of the theme, otherwise name will be used",
    "author": "Author Name",
    "description": "The description of the theme",
    "image": "./path/to/img", /* All path should start by './', and should point to JPEG or PNG images */
    "version": "SemVer version",
    "git": "git repository URL", /* ex: https://github.com/name/plugin */
    "type": "theme",
    "main": "The css file that will be used",
    "activation": "activation regex",
}
```

## Step 4: Create appropriate files
- Drag and drop an image
- Create the main CSS file

Your CSS file can use the follwoing classes:
```css
body {}
.codemirror-gutter {}
.codemirror {}
.codemirror ::selection {}
.codemirror-gutter-element {}
.codemirror-content {}
.cm-keyword {}
.cm-comment {}
.cm-bracket {}
.cm-attribute {}
.codemirror-matchingbracket {}
.cm-atom {}
.cm-string {}
.cm-string-2 {}
.cm-qualifier {}
.cm-property {}
.cm-number {}
.cm-def {}
.cm-variable {}
.cm-punctuation {}
.cm-operator {}
.cm-variable-2 {}
.cm-variable-3 {}
.cm-type {}
.cm-meta {}
.cm-builtin {}
.cm-tag {}
.cm-hr {}
.cm-link {}
```
## Step 5: Commit and publish
Now you've created everything, you can commit and push you work using the Git Panel and the Repository menu, both accessible from the editor view.

## Step 6: Install and test your theme
You can clone and test your theme to make sure it's behaving the way it should.
