#!/usr/bin/env python


from collections import namedtuple
import json
import os
import sys
import urllib2


Bundle = namedtuple('Bundle' , 'seq ext bundleName totalBytes files')

Diff = namedtuple('Diff', 'status path oldBytes newBytes isBigger diff')
BundleDiff = namedtuple('BundleDiff', 'total files')


class Status:
    added    = 'added'
    modified = 'modified'
    deleted  = 'deleted'


def humanize(value):
    abbrevs = (
        (1<<20, 'MB'),
        (1<<10, 'kB'),
        (1, 'bytes')
    )
    if value == 1:
        return '1 byte'
    for factor, suffix in abbrevs:
        if value >= factor:
            break
    return '%d %s' % (value / factor, suffix)


def readBundle(path):
    bundles = []
    with open(path) as f:
        data = json.load(f)
        for result in data['results']:
            filename = os.path.basename(result['bundleName'])
            seq = filename.split('.')[0]
            _, ext = os.path.splitext(filename)
            bundle = Bundle(
                seq=seq,
                ext=ext,
                bundleName=result['bundleName'],
                totalBytes=result['totalBytes'],
                files=result['files'])
            bundles.append(bundle)
    return bundles


def printRow(diff, element):
    if diff.status == Status.added:
        status = '+'
    elif diff.status == Status.modified:
        status = 'M'
    else:
        status = '-'

    sign = '+' if diff.isBigger else ''
    ob = humanize(diff.oldBytes) if diff.oldBytes > 0 else ''
    nb = humanize(diff.newBytes) if diff.newBytes > 0 else ''

    return '''<tr>
            <{element}>{status}</{element}>
            <{element}>{path}</{element}>
            <{element}>{ob}</{element}>
            <{element}>{nb}</{element}>
            <{element}>{sign}{diff}</{element}>
        </tr>'''.format(
            element=element,
            status=status, path=diff.path,
            ob=ob, nb=nb,
            sign=sign, diff=humanize(diff.diff))


def printBundleTable(diffs, element):
    rows = []
    for diff in diffs:
        rows.append(printRow(diff, element))
    return '<table><tbody>{body}</tbody></table>'.format(body='\n'.join(rows))


def printBundleDiff(bundleDiff):
    summary = printBundleTable([bundleDiff.total], 'th')
    details = printBundleTable(bundleDiff.files, 'td')

    return '''
<details>
    <summary>{summary}</summary>
    {details}
</details>
'''.format(summary=summary, details=details)


def makeDiff(path, oldBytes, newBytes):
    if oldBytes > 0 and newBytes > 0:
        status = Status.modified
    elif oldBytes == 0:
        status = Status.added
    else:
        status = Status.deleted
    return Diff(
        status=status,
        path=path,
        oldBytes=oldBytes,
        newBytes=newBytes,
        isBigger=newBytes > oldBytes,
        diff=newBytes - oldBytes,
    )


def diffBundle(ba, bb):
    filesDiffs = []
    diff = bb.totalBytes - ba.totalBytes
    if abs(diff) > 100:
        totalDiff = makeDiff(ba.bundleName, ba.totalBytes, bb.totalBytes)

        for aFile in ba.files:
            aSize = ba.files[aFile]['size']
            if aFile in bb.files:
                bSize = bb.files[aFile]['size']
                if aSize != bSize:
                    filesDiffs.append(makeDiff(aFile, aSize, bSize))
            else:
                filesDiffs.append(makeDiff(aFile, aSize, 0))

        for bFile in bb.files:
            bSize = bb.files[bFile]['size']
            if bFile not in ba.files:
                filesDiffs.append(makeDiff(bFile, 0, bSize))

        return BundleDiff(total=totalDiff, files=filesDiffs)


def summarize(diffs):
    totalDiff = 0
    for diff in diffs:
        totalDiff += diff.total.diff
    sign = '+' if totalDiff > 0 else ''
    return '### Total diff: {sign}{totalDiff}'.format(
        sign=sign, totalDiff=humanize(totalDiff))


def postComment(diffs, pr, token, owner='prymitive', repo='karma'):
    api = 'api.github.com'
    uri = 'https://{api}/repos/{owner}/{repo}/issues/{pr}/comments'.format(
        api=api, owner=owner, repo=repo, pr=pr)

    rows = []
    for diff in diffs:
        rows.append(printBundleDiff(diff))
    summary = summarize(diffs)
    data = '*Webpack bundle size diff*\n{summary}\n{rows}'.format(
        summary=summary, rows='\n'.join(rows))
    encoded = json.dumps({'body': data})

    req = urllib2.Request(uri)
    req.add_header('Authorization', 'token %s' % token)
    req.add_header("Content-Type", "application/json")
    try:
        response = urllib2.urlopen(req, encoded)
    except Exception as e:
        print("Request to '%s' failed: %s" % (uri, e))


def diffBundles(a, b):
    diffs = []
    for ba in a:
        found = False
        for bb in b:
            if ba.seq == bb.seq and ba.ext == bb.ext:
                found = True
                d = diffBundle(ba, bb)
                if d:
                    diffs.append(d)
                break
        if not found:
            bb = Bundle(
                    seq=ba.seq,
                    ext=ba.ext,
                    bundleName=ba.bundleName,
                    totalBytes=0,
                    files={}
            )
            d = diffBundle(ba, bb)
            if d:
                diffs.append(d)

    for bb in b:
        found = False
        for ba in a:
            if bb.seq == ba.seq and ba.ext == bb.ext:
                found = True
        if not found:
            ba = Bundle(
                    seq=bb.seq,
                    ext=bb.ext,
                    bundleName=bb.bundleName,
                    totalBytes=0,
                    files={}
            )
            d = diffBundle(ba, bb)
            if d:
                diffs.append(d)

    diffs.sort(key=lambda x: x.total.newBytes, reverse=True)
    return diffs


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: PATH1 PATH2')
        sys.exit(1)

    token = os.getenv('GITHUB_TOKEN')
    pr = os.getenv('TRAVIS_PULL_REQUEST')
    bundleA = readBundle(sys.argv[1])
    bundleB = readBundle(sys.argv[2])

    if not token:
        print('GITHUB_TOKEN env variable is missing')
        sys.exit(1)
    if not pr:
        print('TRAVIS_PULL_REQUEST env variable is missing')
        sys.exit(1)
    if not bundleA or not bundleB:
        print('Usage: PATH1 PATH2')
        sys.exit(1)

    diffs = diffBundles(bundleA, bundleB)
    if diffs:
        print('Found diffs, posting to GitHub')
        postComment(diffs, pr, token)
    else:
        print('No diff found')
