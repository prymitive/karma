#!/usr/bin/env python3


import json
import os
import sys
from urllib.request import Request, urlopen


def apiRequest(token, path, owner='prymitive', repo='karma'):
    api = 'api.github.com'
    uri = 'https://{api}/repos/{owner}/{repo}{path}'.format(
        api=api, owner=owner, repo=repo, pr=pr, path=path)

    req = Request(uri)
    req.add_header('Authorization', 'token %s' % token)
    req.add_header("Content-Type", "application/json")

    return req

def findComment(pr, token, commentName):
    req = apiRequest(token, "/issues/{pr}/comments".format(pr=pr))
    try:
        response = urlopen(req)
    except Exception as e:
        print("Request to '%s' failed: %s" % (uri, e))
    else:
        comments = json.load(response)
        for comment in comments:
            if comment['body'].startswith(commentName):
                return comment['id']


def formatComment(commentName, comment):
    return '{name}\n\n{body}'.format(name=commentName, body=comment)


def editComment(pr, token, commentID, commentName, comment):
    req = apiRequest(token, "/issues/comments/{id}".format(id=commentID))
    req.get_method = lambda: 'PATCH'
    print('Editing a comment on {uri}'.format(uri=req.get_full_url()))

    body = json.dumps({"body": formatComment(commentName, comment)}).encode('utf-8')
    try:
        urlopen(req, body)
    except Exception as e:
        print("Failed to updated comment '%s': %s" % (req.get_full_url(), e))
        sys.exit(1)


def postComment(pr, token, commentName, comment):
    req = apiRequest(token, "/issues/{pr}/comments".format(pr=pr))
    print('Posting new comment to {uri}'.format(uri=req.get_full_url()))

    body = json.dumps({"body": formatComment(commentName, comment)}).encode('utf-8')
    try:
        urlopen(req, body)
    except Exception as e:
        print("Failed to create a comment '%s': %s" % (req.get_full_url(), e))
        sys.exit(1)


def deleteComment(pr, token, commentID):
    req = apiRequest(token, "/issues/comments/{id}".format(id=commentID))
    req.get_method = lambda: 'DELETE'
    print('Deleting comment on {uri}'.format(uri=req.get_full_url()))

    try:
        urlopen(req)
    except Exception as e:
        print("Failed to updated comment '%s': %s" % (req.get_full_url(), e))
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print('Usage: NAME PATH FORMAT')
        sys.exit(1)

    token = os.getenv('GITHUB_TOKEN')
    pr = os.getenv('PULL_REQUEST_NUMBER')
    commentName = sys.argv[1]
    commentFile = sys.argv[2]
    format = sys.argv[3]

    if not token:
        print('GITHUB_TOKEN env variable is missing')
        sys.exit(1)
    if not pr:
        print('PULL_REQUEST_NUMBER env variable is missing')
        sys.exit(1)
    if not commentName or not commentFile or not format:
        print('Usage: NAME PATH FORMAT')
        sys.exit(1)

    with open(commentFile) as f:
        comment = f.read()

    commentID = findComment(pr, token, commentName)

    if not comment:
        print('{path} is empty'.format(path=commentFile))
        if commentID:
            deleteComment(pr, token, commentID)
    else:
        if format == 'noformat':
            comment = '```\n{body}\n```'.format(body=comment)

        if commentID is None:
            postComment(pr, token, commentName, comment)
        else:
            editComment(pr, token, commentID, commentName, comment)
