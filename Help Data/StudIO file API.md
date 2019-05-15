# What?
StudIO requires plugins. These plugins needs to be described through a JSON file called `studio-package.json`.

Here is the template it should **imperatively** follow:
```js
{
	"name": "Unique name of the package, using Camel Case", /* https://en.wikipedia.org/wiki/Camel_case */
	"title": "Optional: title of the plugin, otherwise name will be used",
	"author": "Author Name",
	"description": "The description of the plugin",
	"image": "./path/to/img", /* All path should start by './', and should point to JPEG or PNG images */
	"version": "SemVer version",
	"git": "git repository URL", /* ex: https://github.com/name/plugin */
	"type": "One of these types: 'mode', 'theme', 'autocomplete'",
	"main": "The javascript file that will be used",
	"activation": "activation regex",
}
```