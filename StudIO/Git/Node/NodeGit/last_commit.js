var NodeGit = require("nodegit");
NodeGit.Repository.open("./").then(function (repo) {
  // Inside of this function we have an open repo
  console.log(repo)
});
