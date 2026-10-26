use anyhow::{anyhow, bail, Result};
use pczt::{Pczt, roles::verifier::Verifier};
use serde_json::json;
use zcash_primitives::transaction::txid::{TxIdDigester, to_txid};

fn main() -> Result<()> {
    let path = std::env::args().nth(1).ok_or_else(|| anyhow!("PCZT path required"))?;
    let pczt = Pczt::parse(&std::fs::read(path)?).map_err(|e| anyhow!("Invalid PCZT: {e:?}"))?;
    let mut total_in: u128 = 0;
    let mut total_out: u128 = 0;
    let mut outputs = Vec::new();
    let pczt = Verifier::new(pczt)
        .with_transparent(|bundle| {
            for input in bundle.inputs() { total_in += u128::from(input.value().into_u64()); }
            for output in bundle.outputs() {
                let value = output.value().into_u64(); total_out += u128::from(value);
                outputs.push(json!({"pool":"transparent","address":output.user_address(),"valueZat":value,"change":false}));
            }
            Ok::<_, pczt::roles::verifier::TransparentError<()>>(())
        }).map_err(|e| anyhow!("Transparent verification: {e:?}"))?
        .with_sapling(|bundle| {
            for spend in bundle.spends() { total_in += u128::from(spend.value().as_ref().expect("Spend value required").inner()); }
            for output in bundle.outputs() {
                let value = output.value().as_ref().expect("Output value required").inner(); total_out += u128::from(value);
                outputs.push(json!({"pool":"sapling","address":output.user_address(),"valueZat":value,"change":output.zip32_derivation().is_some()}));
            }
            Ok::<_, pczt::roles::verifier::SaplingError<()>>(())
        }).map_err(|e| anyhow!("Sapling verification: {e:?}"))?
        .with_orchard(|bundle| {
            for action in bundle.actions() {
                total_in += u128::from(action.spend().value().as_ref().expect("Spend value required").inner());
                let output = action.output(); let value = output.value().as_ref().expect("Output value required").inner(); total_out += u128::from(value);
                outputs.push(json!({"pool":"orchard","address":output.user_address(),"valueZat":value,"change":output.zip32_derivation().is_some()}));
            }
            Ok::<_, pczt::roles::verifier::OrchardError<()>>(())
        }).map_err(|e| anyhow!("Orchard verification: {e:?}"))?
        .with_ironwood(|bundle| {
            for action in bundle.actions() {
                total_in += u128::from(action.spend().value().as_ref().expect("Spend value required").inner());
                let output = action.output(); let value = output.value().as_ref().expect("Output value required").inner(); total_out += u128::from(value);
                outputs.push(json!({"pool":"ironwood","address":output.user_address(),"valueZat":value,"change":output.zip32_derivation().is_some()}));
            }
            Ok::<_, pczt::roles::verifier::OrchardError<()>>(())
        }).map_err(|e| anyhow!("Ironwood verification: {e:?}"))?
        .finish();
    if total_out > total_in { bail!("Outputs exceed inputs"); }
    let fee: u64 = (total_in-total_out).try_into()?;
    let effects = pczt.into_effects().map_err(|e| anyhow!("Transaction effects unavailable: {e:?}"))?;
    let digest = effects.digest(TxIdDigester);
    let txid = to_txid(effects.version(),effects.consensus_branch_id(),&digest);
    println!("{}",json!({"txid":txid.to_string(),"feeZat":fee,"outputs":outputs}));
    Ok(())
}
