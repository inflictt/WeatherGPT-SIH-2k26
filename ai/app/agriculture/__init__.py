"""
The agriculture layer.

Pure Python, no framework imports, exactly like `app/engines/` — which is what
lets every number in it be tested and audited without starting a server.

The division of labour the PRD asks for (§26) holds here:

    thresholds.py   published numbers, with their source named
    crop_calendar.py  lifecycle durations, and where a crop is today
    irrigation.py   whether to water, and what it did not know
    crop_risk.py    the nine farm risk categories, scored and explained
    disease.py      an image class plus weather -> a disease risk band
    context.py      assembles the bundle a language model is allowed to read

Nothing in here calls a model. Models classify images; these modules decide
what the classification *means*, and they do it with arithmetic that a person
can check.
"""
