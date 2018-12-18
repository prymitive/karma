workflow "Docker image" {
  on = "push"
  resolves = ["Tag Docker image"]
}

action "Build docker image" {
  uses = "actions/docker/cli@76ff57a"
  args = "build -t prymitive/karma ."
}

action "Tag Docker image" {
  uses = "actions/docker/tag@76ff57a"
  needs = ["Build docker image"]
  args = "--no-latest --no-refs prymitive/karma prymitive/karma"
}
