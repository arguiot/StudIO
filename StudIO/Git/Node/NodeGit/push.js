const git = require('isomorphic-git');
const fs = require('fs');
git.plugins.set('fs', fs)
const http = require('http');
// console.log(`Pushing repo at: ${process.argv[2]}`)
(async function push() {
	const rPath = process.argv[2]
	const email = process.argv[3]
	const passwd = process.argv[4]
	console.log(rPath, email, passwd)
	try {
 const commits = await git.log({ dir: rPath, depth: 5 })
        console.log(commits)
		const pushResponse = await git.push({
			dir: rPath,
			remote: 'origin',
			ref: 'master',
			authUsername: email,
			authPassword: passwd
		})
		console.log(`Pushed repo at ${rPath} to origin.\nAnswer: ${pushResponse}`)
	} catch(e) {
		console.log(e)
	}
})()
