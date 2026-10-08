# Try Local CSV Lens with fictional data

Open the [live demo](https://vugarbbakhishov-hub.github.io/local-csv-lens/).
Download either example using the links beside the input, then choose that file
with **Choose a CSV file**. No private data is needed.

| Example | Data rows | Columns | Empty cells | Duplicate rows | Completeness |
| --- | ---: | ---: | ---: | ---: | ---: |
| [quality-check.csv](../public/samples/quality-check.csv) | 3 | 2 | 2 | 1 | 67% |
| [type-check.csv](../public/samples/type-check.csv) | 2 | 3 | 0 | 0 | 100% |

The first example has one blank record and one repeated record. Its columns are
text and number. The second has text, text and number columns: postal codes
retain leading zeros, February 30 is not a valid date, and scientific notation
is numeric. A text type is a classification, not a validation warning.

Download JSON and compare these numbers. Edit a value: results should hide until
you click **Analyze data**. Choose **Load sample** to restore the built-in demo.

To try error recovery, paste this deliberately malformed input:

```csv
name
"abc"tail
```

Click **Analyze data**. An error should appear and report downloads should be
hidden. Remove `tail` and analyze again: one row containing `abc` should appear.

## Share what happened

Use **Share feedback** or **Report a problem** in the demo footer. GitHub sign-in
is required, and submitted feedback is public. Include the example filename,
browser, expected and actual result, and what you would use the tool for.
The feedback form lets you select the example by name and record any difference
from this walkthrough. For a bug, include the actions needed to reproduce it.
Do not attach private data. These are internal test examples, not evidence of
external adoption; participation is optional.
