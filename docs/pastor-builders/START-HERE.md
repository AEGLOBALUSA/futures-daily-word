# Start here, Ryan

## What you're building, and why
Ashley built the Daily Word Bible app for every campus. You're the first "beta creator": you get to work out what extra things Alpharetta people should have, beyond what's already there. You build it with an AI assistant called Claude, and you test it. For now, everything you build is for Alpharetta only. If it works well, Ashley may decide later to give it to every campus. That decision is his.

## What you need
- A GitHub account. This is where your changes get saved and reviewed.
- Your Claude account, the one you already use at claude.ai/code. That's the assistant that will do the typing for you.
- The app on your phone, signed in as pastor, with your campus set to Alpharetta. (More tab → "Sign in as pastor".)

## How building works
It's four steps, every time:
1. **Tell Claude what you want.** Plain English. Say what it should do and who should see it.
2. **Wait for the green checks.** These are automatic tests that make sure nothing else in the app broke. They take a few minutes.
3. **Merge.** Once the checks are green, Claude (or you) presses Merge. It goes live, but only you see the new feature.
4. **Try it in the real app.** Open the Alpharetta panel on the Campus tab, signed in as pastor. If it needs changing, tell Claude and go round again.

You'll also see a Netlify "deploy preview" line on the pull request waiting for approval. You don't need it: merge when the checks are green and look at it in the real app, where only you can see it.

When you're happy with it and want every Alpharetta member to see it, tell Claude to switch it on for everyone and merge again.

## The three colours
Every change gets checked and coloured:
- **Green:** inside your own space. Goes through once the checks pass.
- **Amber:** touches something every campus uses. Still allowed, but Claude has to explain what it changes, and you tick a box confirming you've read it.
- **Red:** the deep, sensitive parts of the app (the server, the database, the update system, saved settings, the safety checks themselves). These always wait for Ashley to approve them, no matter what.

## The simple rules
- **Sunday pause.** No merges from Saturday 6pm to Sunday 2pm, Atlanta time. This protects the app on your biggest day. Undoing a bad change still works even during the pause.
- **Undo is easy.** If something goes wrong, tell Claude, or open the pull request on GitHub and press Revert. Ashley can also roll the whole site back if needed.
- **No private details in code.** Never put real names, emails, or phone numbers into anything Claude writes. The code is public.
- **Don't worry about breaking things.** The automated checks catch most mistakes before they go live. Anything serious enough to cause real damage is red, and waits for Ashley.

## Three ideas to try first
Just say one of these to Claude, in your own words:
- "Add a 'This week at Alpharetta' card with our service times and one thing to pray for."
- "Add a page where new people can see their next step at Alpharetta."
- "Add a short welcome from me at the top of the Alpharetta panel."

That's it. Tell Claude what you're picturing, and let the four steps do the rest.
