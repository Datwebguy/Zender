use anyhow::{anyhow, bail, Result};
use pczt::{Pczt, roles::verifier::Verifier};
use serde_json::json;
use zcash_keys::{keys::UnifiedFullViewingKey, address::Address};
use zcash_protocol::consensus::Network;
use zip32::Scope;
use zcash_primitives::transaction::txid::{TxIdDigester, to_txid};

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str)==Some("--match-address") {
        if args.len()!=6 { bail!("Network, pool and two addresses required"); }
        let network=match args[2].as_str(){"mainnet"=>Network::MainNetwork,"testnet"=>Network::TestNetwork,_=>bail!("Invalid network")};
        let left=Address::decode(&network,&args[4]).ok_or_else(||anyhow!("Invalid address"))?;
        let right=Address::decode(&network,&args[5]).ok_or_else(||anyhow!("Invalid address"))?;
        let matches=match (&left,&right) {
            (Address::Unified(a),Address::Unified(b)) if args[3].contains("Orchard")||args[3].contains("Ironwood")=>a.orchard().is_some()&&a.orchard()==b.orchard(),
            (Address::Unified(a),Address::Unified(b)) if args[3].contains("Sapling")=>a.sapling().is_some()&&a.sapling()==b.sapling(),
            _=>false,
        };
        println!("{}",json!({"matches":matches}));return Ok(());
    }
    let path = std::env::args().nth(1).ok_or_else(|| anyhow!("PCZT path required"))?;
    let viewing_path = std::env::args().nth(2).ok_or_else(|| anyhow!("Paying wallet viewing key path required"))?;
    let network = match std::env::args().nth(3).as_deref() { Some("mainnet") => Network::MainNetwork, Some("testnet") => Network::TestNetwork, _ => bail!("Network required") };
    let viewing = UnifiedFullViewingKey::decode(&network, std::fs::read_to_string(viewing_path)?.trim()).map_err(|_| anyhow!("Invalid paying wallet viewing key"))?;
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
                outputs.push(json!({"pool":"sapling","address":output.user_address(),"valueZat":value,"change":output.recipient().as_ref().and_then(|address|viewing.sapling().and_then(|key|key.decrypt_diversifier(address))).map(|(_,scope)|scope==Scope::Internal).unwrap_or(false)}));
            }
            Ok::<_, pczt::roles::verifier::SaplingError<()>>(())
        }).map_err(|e| anyhow!("Sapling verification: {e:?}"))?
        .with_orchard(|bundle| {
            for action in bundle.actions() {
                total_in += u128::from(action.spend().value().as_ref().expect("Spend value required").inner());
                let output = action.output(); let value = output.value().as_ref().expect("Output value required").inner(); total_out += u128::from(value);
                outputs.push(json!({"pool":"orchard","address":output.user_address(),"valueZat":value,"change":output.recipient().as_ref().and_then(|address|viewing.orchard().and_then(|key|key.scope_for_address(address))).map(|scope|scope==Scope::Internal).unwrap_or(false)}));
            }
            Ok::<_, pczt::roles::verifier::OrchardError<()>>(())
        }).map_err(|e| anyhow!("Orchard verification: {e:?}"))?
        .with_ironwood(|bundle| {
            for action in bundle.actions() {
                total_in += u128::from(action.spend().value().as_ref().expect("Spend value required").inner());
                let output = action.output(); let value = output.value().as_ref().expect("Output value required").inner(); total_out += u128::from(value);
                outputs.push(json!({"pool":"ironwood","address":output.user_address(),"valueZat":value,"change":output.recipient().as_ref().and_then(|address|viewing.orchard().and_then(|key|key.scope_for_address(address))).map(|scope|scope==Scope::Internal).unwrap_or(false)}));
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
