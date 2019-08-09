# Using Git
Git is a version control system for tracking changes in computer files and coordinating work on those files among multiple people. It is primarily used for source code management in software development, but it can be used to keep track of changes in any set of files.

> TLDR; Git is a tool that tracks your files within StudIO over time.

In git terms, a project is called a `repository` (so you will see this word quite often in this documentation or in the StudIO app).

> To understand the next sections, you need to have used git in the past or have read [git’s handbook](https://guides.github.com/introduction/git-handbook/)

### Creating a repository
Please refer to the “Create a project” section.

### Tracking changes / commit
When you want to freeze the state of a file (basically save a specific version of a file), you need to tell Git to do so. Doing a such action is called a `commit`. Commits should have a name or a small description so you can remember which is which. They also can contain multiple files.

So let’s say you where working on your project and you added a cool new feature to it.

Now, click on the tree icon right from the editor screen. You should now see an interface popping from the right of the screen showing a list of all your modified files. Now just write a commit message in the text area and click “commit”

### Interaction with remotes

Git can be incredibly useful when it comes to share and edit your code with others. In order to do that, you need to synchronize your code with your remotes.

First, go to the repository interface (the book icon in the editor screen). Then you should see many advanced options. We'll focus on the simplest ones: `push`, `fetch` and `pull`.

If you have local commits that are not on your remote, just tap on `push`. If there are commits on your remotes that you want to download, just tap on `pull`.

> Please remember that some git operations can sometimes be destructive, so be careful before doing anything. If you need help, you can contact me.

Now, just use these operations as you would normally do on a computer.
