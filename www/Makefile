dev:
	./packaton.js development 

build: 
	./packaton.js production

preview: build
	open http://localhost:8989
	docker run --rm \
		-p 8989:80 \
		-v $(PWD)/nginx-preview.conf:/etc/nginx/nginx.conf:ro \
		-v $(PWD)/dist:/dist/:ro \
		nginx:alpine

zip: build
	open https://dash.cloudflare.com/217e3cb321d535a2b5a4cddb3b4439fc/pages/view/mockaton/deployments/new
	rm -f dist.zip
	cd dist && zip -r -X ../dist.zip .


avif:
	npx mediasnacks avif -y 'src/assets/media/**/*.png'

moov2front:
	npx mediasnacks moov2front 'src/assets/media/**/*.mp4'

resize-video:
	npx mediasnacks resize --overwrite --width 1920 'src/assets/media/**/*.mp4'


.PHONY: *
