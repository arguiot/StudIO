# Instructions
StudIO is a code editor, and so it’s made for developer (usually power user). So it’s supposed to be a little bit less intuitive than common apps. Here is a step by step guide to test and use StudIO:

When you launch the app for the first time, it will ask you for sending notifications. These notifications are optionals, and can be disabled without compromising the app’s main goal.

On the top navigation bar, there are a few buttons: the first one (book) will show a small built-in documentation that is supposed to help you using the app. Then, there is the plugin button (square with a +), that will help you install plugins (we’ll come to that later). There is also the settings button, that will (obviously) help manage the app preferences. Finally, the plus button will show you a dialog box to create/clone a new project.

## Creating a project
You want to start using StudIO, but you have no idea what to do? One of the very first things you will do before using StudIO is to create a project.

*But what is a project?*

You can see a project as a folder or a directory where you can store all of your code / files. All project will also act as a local git repository, so you can create commits.

> If you have no idea what a git repository is, just google it or send me an email at arguiot@gmail.com

To do so, when you're on the launch screen, just tap on the **+** icon in the upper right corner of your screen.

You should now see an action sheet that ask you wether you want to **Clone a repository** or **Start a local repository**

Just pick an option, and you should be ready to go.

> For testing, cloning is better, as you won’t have the need to create files, etc..  
> Here is a sample git repository: https://github.com/arguiot/TheoremJS

Now, just navigate into the project, try some things (it shouldn’t be too hard to understand)

## Plugins

StudIO can be customized with the help of plugins. To respect the Human Design guidelines, all external code is executed inside a `WKWebView` with some restriction to protect user’s privacy and for some security reasons.

To add a plugin, first go back to the main screen and tap on the button with a square and a plus sign in it. Then it will show you a window, with the list of active plugins (will be empty if no plugins are installed), tap the + button on the right corner, and then type the git url of your plugin.

> Here is a sample plugin: https://github.com/studio-code/Ubuntu-Theme

Now, just tap on the black check button on the right of the text field, and wait until the plugin is downloaded. You should see an image and the plugin description appear as soon as this step is complete. Now, press the « Done » button on the top right corner, and the plugin should be installed.

> As the sample plugin is a theme, head back to the main screen, open the settings window and choose « Ubuntu Theme ». Now, when you will open a file in the editor screen, the feeling and the color theme should be different.

