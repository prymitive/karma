#!/usr/bin/env python


import json
import os
import sys
import urllib2


def patchGist(filepath, gist_id, token):
    api = 'api.github.com'
    uri = 'https://{api}/gists/{gist_id}'.format(api=api, gist_id=gist_id)

    with open(filepath) as f:
        data = f.read()

    filename = os.path.basename(filepath)
    payload = {
        "description": "Webpack bundle size stats",
        "files": {
            filename: {
                "content": data,
                "filename": filename
            }
        }
    }

    req = urllib2.Request(uri)
    req.get_method = lambda: 'PATCH'
    req.add_header('Authorization', 'token %s' % token)
    try:
        response = urllib2.urlopen(req, json.dumps(payload))
    except Exception as e:
        print("Request to '%s' failed: %s" % (uri, e))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: GIST_ID FILE')
        sys.exit(1)

    token = os.getenv('GITHUB_TOKEN')
    if not token:
        print('GITHUB_TOKEN env variable is missing')
        sys.exit(1)

    gist_id = sys.argv[1]
    filepath = sys.argv[2]
    if not gist_id or not filepath:
        print('Usage: GIST_ID FILE')
        sys.exit(1)

    patchGist(filepath, gist_id, token)
