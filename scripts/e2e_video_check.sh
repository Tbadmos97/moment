#!/usr/bin/env bash
set -euo pipefail
set +H

API="${API:-http://localhost:5000/api}"
TS="$(date +%s)"
CREATOR_EMAIL="creator_video_${TS}@example.com"
CONSUMER_EMAIL="consumer_video_${TS}@example.com"
CREATOR_USER="creator_video_${TS}"
CONSUMER_USER="consumer_video_${TS}"
PASS="Pass1234A"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XWQ0AAAAASUVORK5CYII=' | base64 -d > "$TMPDIR/sample.png"
head -c 2048 /dev/urandom > "$TMPDIR/sample.mp4"

creator_register=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$CREATOR_USER\",\"email\":\"$CREATOR_EMAIL\",\"password\":\"$PASS\",\"role\":\"creator\"}")
creator_token=$(echo "$creator_register" | jq -r '.data.accessToken')
creator_id=$(echo "$creator_register" | jq -r '.data.user._id')

img_upload=$(curl -s -X POST "$API/photos" \
  -H "Authorization: Bearer $creator_token" \
  -F "title=Image Upload $TS" \
  -F "caption=Image test" \
  -F "locationName=London, UK" \
  -F "tags=[\"test\",\"image\"]" \
  -F "people=[\"Alice\"]" \
  -F "isPublished=true" \
  -F "image=@$TMPDIR/sample.png;type=image/png")
img_ok=$(echo "$img_upload" | jq -r '.success')
img_id=$(echo "$img_upload" | jq -r '.data.photo._id')

vid_upload=$(curl -s -X POST "$API/photos" \
  -H "Authorization: Bearer $creator_token" \
  -F "title=Video Upload $TS" \
  -F "caption=Video test" \
  -F "locationName=London, UK" \
  -F "tags=[\"test\",\"video\"]" \
  -F "people=[\"Bob\"]" \
  -F "width=1280" \
  -F "height=720" \
  -F "isPublished=true" \
  -F "image=@$TMPDIR/sample.mp4;type=video/mp4")
vid_ok=$(echo "$vid_upload" | jq -r '.success')
vid_id=$(echo "$vid_upload" | jq -r '.data.photo._id')
vid_media_type=$(echo "$vid_upload" | jq -r '.data.photo.mediaType')
vid_mime=$(echo "$vid_upload" | jq -r '.data.photo.mimeType')

creator_logout=$(curl -s -X POST "$API/auth/logout" \
  -H "Authorization: Bearer $creator_token" \
  -H 'Content-Type: application/json' \
  -d '{"allDevices":false}')
creator_logout_ok=$(echo "$creator_logout" | jq -r '.success')

consumer_register=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$CONSUMER_USER\",\"email\":\"$CONSUMER_EMAIL\",\"password\":\"$PASS\",\"role\":\"consumer\"}")
consumer_token=$(echo "$consumer_register" | jq -r '.data.accessToken')

feed=$(curl -s "$API/photos")
feed_total=$(echo "$feed" | jq -r '.data.total')
found_video=$(echo "$feed" | jq -r --arg VID "$vid_id" '.data.photos | map(select(._id == $VID)) | length')

comment=$(curl -s -X POST "$API/photos/$vid_id/comments" \
  -H "Authorization: Bearer $consumer_token" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Great video","rating":5}')
comment_ok=$(echo "$comment" | jq -r '.success')

rating=$(curl -s "$API/photos/$vid_id/rating")
rating_avg=$(echo "$rating" | jq -r '.data.averageRating')

consumer_logout=$(curl -s -X POST "$API/auth/logout" \
  -H "Authorization: Bearer $consumer_token" \
  -H 'Content-Type: application/json' \
  -d '{"allDevices":false}')
consumer_logout_ok=$(echo "$consumer_logout" | jq -r '.success')

admin_login=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin123@gmail.com","password":"admin123"}')
admin_token=$(echo "$admin_login" | jq -r '.data.accessToken')
admin_role=$(echo "$admin_login" | jq -r '.data.user.role')

admin_photos=$(curl -s "$API/admin/photos" -H "Authorization: Bearer $admin_token")
admin_has_video=$(echo "$admin_photos" | jq -r --arg VID "$vid_id" '.data.photos | map(select(._id == $VID and .mediaType == "video")) | length')

echo "creator_id=$creator_id"
echo "image_upload_success=$img_ok image_id=$img_id"
echo "video_upload_success=$vid_ok video_id=$vid_id mediaType=$vid_media_type mimeType=$vid_mime"
echo "creator_logout_success=$creator_logout_ok"
echo "feed_total=$feed_total found_video_in_feed=$found_video"
echo "consumer_comment_success=$comment_ok rating_avg=$rating_avg"
echo "consumer_logout_success=$consumer_logout_ok"
echo "admin_role=$admin_role admin_has_video=$admin_has_video"
