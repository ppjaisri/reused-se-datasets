# Reused datasets in empirical SE research

Website: https://ppjaisri.github.io/reused-se-datasets/

An interactive list of the 313 datasets reused by 184 empirical software engineering papers
published from 2021 to 2025 in ten venues (ASE, FSE, ICSE, ICSME, MSR, SANER, EMSE, JSS, TOSEM, TSE).
You can search the datasets, filter them by research topic, venue, paper year, and source type,
and see which papers reuse each dataset.

It accompanies the paper *Show me the Dataset! Preliminary Exploration into Empirical Software Engineering Research*.
The full results of the paper are on Zenodo: https://doi.org/10.5281/zenodo.24155721 (CC BY 4.0).

## Files

- `index.html`, `assets/`: the website (static, no build step or external libraries).
- `data/datasets.js`: the data used by the website.
- `data/reused_datasets.csv`, `data/dataset_uses.csv`: the same lists as in the Zenodo record.
- `build_site_data.py`: rebuilds `data/` from the `results/` folder of the Zenodo record:
  `python build_site_data.py <path to results> .`
