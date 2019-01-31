const git = require('isomorphic-git');
const fs = require('fs');
git.plugins.set('fs', fs)
const http = require('http');
console.log(`Pushing repo at: ${rPath}`)
async function push() {
	const rPath = process.argv[2]
	const email = process.argv[3]
	const passwd = process.argv[4]
	const pushResponse = await git.push({
		dir: rPath,
		remote: 'origin',
		ref: 'master',
		username: email,
		password: passwd
	})
	console.log(`Pushed repo at ${rPath} to origin.\nAnswer: ${pushResponse}`)
}()
