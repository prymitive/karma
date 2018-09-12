.PHONY: heroku
heroku:
	docker pull lmierzwa/karma:latest
	heroku container:push web -R
	heroku container:release web
