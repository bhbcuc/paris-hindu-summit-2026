# Summit mail router

This Email Routing Worker archives incoming mail and forwards a copy to every
verified address in `FORWARD_TO`.

While the backend migration is in flight, every message is archived to both
backends: Convex (`CONVEX_MAIL_ENDPOINT`, serving live Vercel production) and
D1 (`MAIL_ARCHIVE_ENDPOINT`, the Cloudflare Worker at
`https://<worker>/api/v1/mail/inbound`). Set `MAIL_ARCHIVE_ENDPOINT` as a
Worker variable to enable the D1 copy; until it is set, only Convex receives
mail. The two posts run in parallel and one failing never cancels the other.

To add another recipient:

1. Verify it in Cloudflare Dashboard → Email Routing → Destination addresses.
2. Add it to the comma-separated `FORWARD_TO` Worker variable.
3. Deploy this Worker again.

`MAIL_INGEST_SECRET` is a Worker secret and must match the same-named variable
in both backends (production Convex environment and the Worker secrets). Never
commit it.
