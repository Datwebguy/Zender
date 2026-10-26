"""Add Zender's inspector and receive-output JSON to the pinned wallet build."""
from pathlib import Path
import shutil
import sys

source = Path(sys.argv[1])
here = Path(__file__).resolve().parent
shutil.copyfile(here / 'inspect.rs', source / 'src' / 'zender_inspect.rs')
manifest = source / 'Cargo.toml'
text = manifest.read_text()
if 'name = "zender-inspect"' not in text:
    text += '\n[[bin]]\nname = "zender-inspect"\npath = "src/zender_inspect.rs"\n'
manifest.write_text(text)
listing = source / 'src/commands/wallet/list_tx.rs'
text = listing.read_text()
needle = '"mined_height": tx.mined_height.map(u32::from),'
addition = '''"outputs": tx.outputs.iter().map(|output| serde_json::json!({
                        "valueZat": output.value.into_u64(),
                        "address": output.to_address,
                        "pool": format!("{:?}", output.pool),
                        "change": output.is_change,
                        "incoming": output.to_account.is_some() && output.from_account.is_none(),
                        "memo": output.memo.as_ref().and_then(|memo| match memo {
                            Memo::Text(text) => Some(text.to_string()), _ => None,
                        }),
                    })).collect::<Vec<_>>(),'''
if '"valueZat": output.value.into_u64()' not in text:
    if text.count(needle) != 1:
        raise RuntimeError('Pinned wallet source no longer matches the integration patch')
    text = text.replace(needle, needle + '\n                    ' + addition)
listing.write_text(text)
