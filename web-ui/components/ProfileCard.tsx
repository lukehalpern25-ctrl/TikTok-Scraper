import React from "react";

interface ProfileCardProps {
  profile: any;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const authorMeta = profile.authorMeta || {};

  const formatNumber = (num: number | string) => {
    const n = typeof num === "string" ? parseInt(num) : num;
    if (!n || isNaN(n)) return "0";

    if (n >= 1000000) {
      return `${(n / 1000000).toFixed(1)}M`;
    } else if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`;
    }
    return n.toString();
  };

  const getEngagementRate = () => {
    const followers = parseInt(authorMeta.fans) || 0;
    const hearts = parseInt(authorMeta.heart) || 0;
    const videos = parseInt(authorMeta.video) || 0;

    if (followers === 0 || videos === 0) return 0;

    const avgLikesPerVideo = hearts / videos;
    const engagementRate = (avgLikesPerVideo / followers) * 100;

    return Math.min(engagementRate, 100); // Cap at 100%
  };

  const getContactTypes = () => {
    const contacts = [];

    if (authorMeta.bioLink) {
      contacts.push("🔗 Bio Link");
    }

    const signature = authorMeta.signature || "";

    // Check for email
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g.test(signature)) {
      contacts.push("✉️ Email");
    }

    // Check for link indicators
    const linkIndicators = ["⬇️", "👇", "link in bio", "see link"];
    if (
      linkIndicators.some((indicator) =>
        signature.toLowerCase().includes(indicator.toLowerCase()),
      )
    ) {
      contacts.push("👉 Link Indicator");
    }

    // Check for social links
    if (
      /\b(?:(?:https?:\/\/|www\.)[^\s<>()]+|(?:linktr\.ee|beacons\.ai|stan\.store|koji\.to|bio\.site|bio\.link|campsite\.bio|flow\.page|tap\.bio|msha\.ke)\/[^\s<>()]+)/i.test(
        signature,
      )
    ) {
      contacts.push("🌐 Social Link");
    }

    return contacts;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  const contactTypes = getContactTypes();
  const engagementRate = getEngagementRate();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col">
      {/* Header with Avatar and Basic Info */}
      <div className="flex items-start gap-3 mb-3">
        <img
          src={
            authorMeta.avatar ||
            authorMeta.originalAvatarUrl ||
            "/placeholder-avatar.png"
          }
          alt={authorMeta.nickName || authorMeta.name}
          className="w-12 h-12 rounded-full object-cover bg-gray-100"
          onError={(e) => {
            e.currentTarget.src =
              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyMCIgcj0iOCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNOCAzNi44QzEwLjggMzEuMiAxNi44IDI4IDI0IDI4UzM3LjIgMzEuMiA0MCAzNi44IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=";
          }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 m-0">
            {authorMeta.nickName || authorMeta.name || "Unknown"}
            {authorMeta.verified && (
              
            )}
          </h3>
          <p className="text-xs text-gray-500 my-0.5">
            @{authorMeta.name || "unknown"}
          </p>
          {authorMeta.bioLink && (
            <a
              href={
                authorMeta.bioLink.startsWith("http")
                  ? authorMeta.bioLink
                  : `${authorMeta.bioLink}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 no-underline"
            >
              🔗 {authorMeta.bioLink}
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-xs text-gray-500">Followers</div>
          <div className="font-semibold text-sm text-gray-900">
            {formatNumber(authorMeta.fans || 0)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Videos</div>
          <div className="font-semibold text-sm text-gray-900">
            {formatNumber(authorMeta.video || 0)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Hearts</div>
          <div className="font-semibold text-sm text-gray-900">
            {formatNumber(authorMeta.heart || 0)}
          </div>
        </div>
      </div>

      {/* Engagement Rate */}
      {typeof engagementRate === "number" && (
        <div className="mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Engagement Rate</span>
            <span
              className={`text-xs font-medium ${
                engagementRate >= 70
                  ? "text-green-600"
                  : engagementRate >= 40
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {engagementRate.toFixed(1)}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-200 rounded-sm mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                engagementRate >= 70
                  ? "bg-green-500"
                  : engagementRate >= 40
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{
                width: `${Math.min(engagementRate, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bio/Signature */}
      {authorMeta.signature && (
        <div className="mb-3 flex-grow">
          <div className="text-xs text-gray-500 mb-1">Bio</div>
          <p className="text-xs text-gray-700 leading-relaxed m-0 break-words">
            {truncateText(authorMeta.signature, 100)}
          </p>
        </div>
      )}

      {/* Contact Types */}
      {contactTypes.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Contact Methods</div>
          <div className="flex flex-wrap gap-1">
            {contactTypes.map((contact, index) => (
              <span
                key={index}
                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
              >
                {contact}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Profile Link */}
      <div className="mt-auto pt-3 border-t border-gray-200">
        <a
          href={
            authorMeta.profileUrl ||
            `https://www.tiktok.com/@${authorMeta.name}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex justify-center items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors no-underline"
        >
          🎵 View Profile
        </a>
      </div>
    </div>
  );
}

