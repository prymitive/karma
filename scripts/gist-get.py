#!/usr/bin/env python


import json
import os
import sys
import urllib2


def downloadFile(workdir, path, uri, token):
    req = urllib2.Request(uri)
    req.add_header('Authorization', 'token %s' % token)
    try:
        response = urllib2.urlopen(req)
    except Exception as e:
        print("Request to '%s' failed: %s" % (uri, e))
    else:
        with open(os.path.join(workdir, path), "wb") as local_file:
            local_file.write(response.read())


def getGist(workdir, gist_id, token):
    api = 'api.github.com'
    uri = 'https://{api}/gists/{gist_id}'.format(api=api, gist_id=gist_id)

    req = urllib2.Request(uri)
    req.add_header('Authorization', 'token %s' % token)
    try:
        response = urllib2.urlopen(req)
    except Exception as e:
        print("Request to '%s' failed: %s" % (uri, e))
    else:
        data = json.load(response)
        for filename, meta in data['files'].items():
            print('Fetching {filename} from {uri}'.format(
                filename=filename, uri=meta['raw_url']))
            downloadFile(workdir, filename, meta['raw_url'], token)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: GIST_ID WORKDIR')
        sys.exit(1)

    token = os.getenv('GITHUB_TOKEN')
    if not token:
        print('GITHUB_TOKEN env variable is missing')
        sys.exit(1)

    gist_id = sys.argv[1]
    workdir = sys.argv[2]
    if not gist_id or not workdir:
        print('Usage: GIST_ID WORKDIR')
        sys.exit(1)

    getGist(workdir, gist_id, token)
