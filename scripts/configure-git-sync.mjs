import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const sitesRemote = git('remote', 'get-url', 'origin');
const { project_id } = JSON.parse(readFileSync('.openai/hosting.json', 'utf8'));
const { hostname, protocol, username, password, pathname } = new URL(sitesRemote);
if (
  hostname !== 'git.chatgpt-team.site' ||
  protocol !== 'https:' ||
  username ||
  password ||
  !project_id ||
  !pathname.endsWith(`/${project_id}.git`)
) {
  throw new Error('Run this command in the Unistay ChatGPT Sites source checkout.');
}

const githubRemote = 'https://github.com/Esfandiyorr/Unistay.uz.git';
git('config', '--local', '--replace-all', 'remote.origin.pushurl', sitesRemote);
git('config', '--local', '--add', 'remote.origin.pushurl', githubRemote);
console.log('Git pushes to origin will update the Sites source repository and Esfandiyorr/Unistay.uz.');
